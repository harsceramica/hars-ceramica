import { parse } from "csv-parse/sync";
import { supabase } from "@/lib/supabaseClient";
import type { Customer, ImportCsvResult, ProductWithCategory, SaleStatus } from "@/types";

type CsvRow = Record<string, string>;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseNumber(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  return Number(normalized || "0");
}

function parseDate(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  const [datePart, timePart = "00:00:00"] = value.split(" ");
  const [day, month, year] = datePart.split("/");
  return new Date(`${year}-${month}-${day}T${timePart}-03:00`).toISOString();
}

function mapStatus(row: CsvRow): SaleStatus {
  const orderStatus = normalizeText(row["Estado de la orden"] || "");
  const paymentStatus = normalizeText(row["Estado del pago"] || "");
  const shippingStatus = normalizeText(row["Estado del envío"] || "");
  const cancelReason = normalizeText(row["Motivo de cancelación"] || "");

  if (cancelReason || orderStatus.includes("cancel")) {
    return "cancelado";
  }

  if (shippingStatus.includes("entregado")) {
    return "entregado";
  }

  if (shippingStatus.includes("despach") || shippingStatus.includes("enviado")) {
    return "despachado";
  }

  if (paymentStatus.includes("recib") || paymentStatus.includes("pag") || paymentStatus.includes("aprob")) {
    if (
      shippingStatus.includes("no esta empaquetado") ||
      shippingStatus.includes("no está empaquetado") ||
      shippingStatus.includes("empaquetado") ||
      shippingStatus === ""
    ) {
      return "por_despachar";
    }

    return "pagado";
  }

  if (orderStatus.includes("abierta") || orderStatus.includes("abierto")) {
    return "pendiente";
  }

  return "pendiente_de_pago";
}

function getProductNameCandidates(rawName: string) {
  const cleaned = rawName.replace(/^Arcilla\s+/i, "").trim();
  const firstPart = cleaned.split("(")[0]?.trim() ?? cleaned;
  return [cleaned, firstPart].map(normalizeText);
}

function mergeCarryForward(rows: CsvRow[]) {
  const carryFields = [
    "Número de orden",
    "Email",
    "Fecha",
    "Estado de la orden",
    "Estado del pago",
    "Estado del envío",
    "Total",
    "Nombre del comprador",
    "DNI / CUIT",
    "Teléfono",
    "Dirección",
    "Número",
    "Localidad",
    "Ciudad",
    "Código postal",
    "Provincia o estado",
    "País",
    "Medio de envío",
    "Medio de pago",
    "Fecha de pago",
    "Fecha de envío",
    "Canal",
    "Identificador de la orden",
    "Motivo de cancelación",
  ];

  const current: CsvRow = {};

  return rows.map((row) => {
    const merged = { ...row };

    for (const field of carryFields) {
      if (row[field]?.trim()) {
        current[field] = row[field];
      } else if (current[field]) {
        merged[field] = current[field];
      }
    }

    return merged;
  });
}

async function getProductsIndex() {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:product_categories(*)")
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  const products = (data ?? []) as ProductWithCategory[];
  const bySku = new Map<string, ProductWithCategory>();
  const byName = new Map<string, ProductWithCategory>();

  for (const product of products) {
    if (product.sku) {
      bySku.set(normalizeText(product.sku), product);
    }

    byName.set(normalizeText(product.name), product);
  }

  return { bySku, byName };
}

async function findOrCreateCustomerFromCsv(row: CsvRow) {
  const name = row["Nombre del comprador"]?.trim() || row["Nombre para el envío"]?.trim();
  const phone = row["Teléfono"]?.trim() || row["Teléfono para el envío"]?.trim() || null;

  if (!name) {
    return { customer: null, created: false };
  }

  let query = supabase.from("customers").select("*").eq("name", name).limit(1);

  if (phone) {
    query = query.eq("phone", phone);
  }

  const { data: existing, error: existingError } = await query.maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const updates: Partial<Customer> = {};

    if (!existing.province && row["Provincia o estado"]) {
      updates.province = row["Provincia o estado"];
    }

    if (!existing.address && row["Dirección"]) {
      updates.address = `${row["Dirección"]} ${row["Número"] || ""}`.trim();
    }

    if (!existing.transport && row["Medio de envío"]) {
      updates.transport = row["Medio de envío"];
    }

    if (!existing.payment_method && row["Medio de pago"]) {
      updates.payment_method = row["Medio de pago"];
    }

    if (!existing.purchase_channel && row["Canal"]) {
      updates.purchase_channel = row["Canal"];
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("customers").update(updates).eq("id", existing.id);
    }

    return { customer: existing, created: false };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name,
      phone,
      province: row["Provincia o estado"] || null,
      address: row["Dirección"]
        ? `${row["Dirección"]} ${row["Número"] || ""}`.trim()
        : null,
      transport: row["Medio de envío"] || null,
      payment_method: row["Medio de pago"] || null,
      purchase_channel: row["Canal"] || "Tiendanube CSV",
      products_of_interest: null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { customer: data, created: true };
}

export async function importTiendanubeSalesCsv(fileBuffer: Buffer): Promise<ImportCsvResult> {
  const content = fileBuffer.toString("latin1");
  const rawRows = parse(content, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  }) as CsvRow[];

  const rows = mergeCarryForward(rawRows);
  const productsIndex = await getProductsIndex();

  let imported = 0;
  let skipped = 0;
  let customersCreated = 0;
  const warnings: string[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const productLabel = row["Nombre del producto"]?.trim();
    const sku = normalizeText(row["SKU"] || "");

    if (!productLabel) {
      skipped += 1;
      continue;
    }

    const product =
      (sku ? productsIndex.bySku.get(sku) : undefined) ??
      getProductNameCandidates(productLabel)
        .map((candidate) => productsIndex.byName.get(candidate))
        .find(Boolean);

    if (!product) {
      skipped += 1;
      warnings.push(`Producto no encontrado para la fila ${index + 2}: ${productLabel}`);
      continue;
    }

    const customerResult = await findOrCreateCustomerFromCsv(row);
    const customer = customerResult.customer;

    if (customerResult.created) {
      customersCreated += 1;
    }

    const packages = parseNumber(row["Cantidad del producto"] || "0");
    const packageSize = Number(product.category?.package_size ?? 1);
    const quantity = packages * packageSize;
    const packagePrice = parseNumber(row["Precio del producto"] || "0");
    const unitPrice = Number((packagePrice / packageSize).toFixed(2));
    const orderReference = row["Identificador de la orden"] || row["Número de orden"];
    const externalLineReference = `${orderReference}:${row["SKU"] || product.id}:${index}`;

    if (quantity <= 0) {
      skipped += 1;
      warnings.push(`Cantidad inválida en la fila ${index + 2}.`);
      continue;
    }

    const { data, error } = await supabase.rpc("create_sale", {
      p_product_id: product.id,
      p_quantity: quantity,
      p_unit_price: unitPrice,
      p_customer_id: customer?.id ?? null,
      p_status: mapStatus(row),
      p_import_source: "tiendanube_csv",
      p_external_reference: orderReference || null,
      p_external_line_reference: externalLineReference,
      p_customer: customer?.name ?? row["Nombre del comprador"] ?? null,
      p_channel: row["Canal"] || "Tiendanube CSV",
      p_created_at: parseDate(row["Fecha"]),
    });

    if (error) {
      skipped += 1;
      warnings.push(`Fila ${index + 2}: ${error.message}`);
      continue;
    }

    if (data) {
      imported += 1;
    }
  }

  return {
    imported,
    skipped,
    customersCreated,
    warnings,
  };
}
