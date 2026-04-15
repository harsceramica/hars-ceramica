"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createCustomer, getCustomers } from "@/lib/services/customers";
import { getProducts } from "@/lib/services/products";
import { createSaleBatch, deleteSale, getSales } from "@/lib/services/sales";
import { applyDiscount, formatCurrency, formatDate, getDiscountPercent } from "@/lib/utils";
import type {
  CustomerFormValues,
  CustomerWithStats,
  ProductWithCategory,
  SaleBatchFormValues,
  SaleLineItemFormValues,
  SaleStatus,
  SaleWithProduct,
} from "@/types";

const initialLineItem: SaleLineItemFormValues = {
  product_id: "",
  quantity: 0,
  unit_price: 0,
};

const initialBatchForm: SaleBatchFormValues = {
  customer_id: "",
  status: "pendiente_de_pago",
  customer: "",
  channel: "",
  items: [initialLineItem],
};

const initialCustomerForm: CustomerFormValues = {
  name: "",
  address: "",
  province: "",
  phone: "",
  transport: "",
  payment_method: "",
  purchase_channel: "",
  products_of_interest: "",
};

const STATUS_OPTIONS: Array<{ value: SaleStatus; label: string }> = [
  { value: "pendiente_de_pago", label: "Pendiente de pago" },
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
  { value: "por_despachar", label: "Por despachar" },
  { value: "despachado", label: "Despachado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

export function SalesView() {
  const [sales, setSales] = useState<SaleWithProduct[]>([]);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [form, setForm] = useState<SaleBatchFormValues>(initialBatchForm);
  const [customerForm, setCustomerForm] = useState<CustomerFormValues>(initialCustomerForm);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setError("");
      const [salesResponse, productsResponse, customersResponse] = await Promise.all([
        getSales(),
        getProducts(),
        getCustomers(),
      ]);

      setSales(salesResponse);
      setProducts(productsResponse);
      setCustomers(customersResponse);
      setForm((current) => ({
        ...current,
        items: current.items.map((item, index) => {
          if (index === 0 && !item.product_id) {
            return {
              ...item,
              product_id: productsResponse[0]?.id ?? "",
              unit_price: Number(productsResponse[0]?.price ?? 0),
            };
          }

          return item;
        }),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las ventas.");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customer_id),
    [customers, form.customer_id],
  );

  const itemSummaries = form.items.map((item) => {
    const product = products.find((entry) => entry.id === item.product_id);
    const discountPercent = getDiscountPercent({
      quantity: Number(item.quantity),
      category: product?.category,
    });
    const finalUnitPrice = applyDiscount(Number(item.unit_price), discountPercent);
    const lineTotal = Number((Number(item.quantity || 0) * finalUnitPrice).toFixed(2));

    return {
      item,
      product,
      discountPercent,
      finalUnitPrice,
      lineTotal,
    };
  });

  const totalKg = itemSummaries.reduce((sum, entry) => sum + Number(entry.item.quantity || 0), 0);
  const totalAmount = itemSummaries.reduce((sum, entry) => sum + entry.lineTotal, 0);

  function updateItem(index: number, updates: Partial<SaleLineItemFormValues>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const nextItem = { ...item, ...updates };
        const selectedProduct = products.find((product) => product.id === nextItem.product_id);

        if (updates.product_id != null) {
          nextItem.unit_price = Number(selectedProduct?.price ?? 0);
        }

        return nextItem;
      }),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          product_id: products[0]?.id ?? "",
          quantity: 0,
          unit_price: Number(products[0]?.price ?? 0),
        },
      ],
    }));
  }

  function removeItem(index: number) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const validItems = form.items.filter((item) => item.product_id && item.quantity > 0);

      if (validItems.length === 0) {
        throw new Error("Agregá al menos un producto con cantidad mayor a cero.");
      }

      await createSaleBatch({
        ...form,
        customer_id: form.customer_id || undefined,
        customer: selectedCustomer?.name || form.customer || undefined,
        channel: form.channel || selectedCustomer?.purchase_channel || undefined,
        items: validItems,
      });

      await loadData();
      setForm({
        ...initialBatchForm,
        items: [
          {
            product_id: products[0]?.id ?? "",
            quantity: 0,
            unit_price: Number(products[0]?.price ?? 0),
          },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la venta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingCustomer(true);
      setError("");
      const newCustomer = await createCustomer(customerForm);
      await loadData();
      setForm((current) => ({
        ...current,
        customer_id: newCustomer.id,
        customer: newCustomer.name,
        channel: current.channel || newCustomer.purchase_channel || "",
      }));
      setCustomerForm(initialCustomerForm);
      setShowCustomerForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el cliente.");
    } finally {
      setSavingCustomer(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setError("");
      await deleteSale(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la venta.");
    }
  }

  function handleCustomerChange(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);

    setForm((current) => ({
      ...current,
      customer_id: customerId,
      customer: customer?.name ?? "",
      channel: current.channel || customer?.purchase_channel || "",
    }));
  }

  return (
    <section>
      <PageHeader
        title="Ventas"
        description="Cargá varias arcillas en una sola venta, con cliente opcional, descuentos automáticos y estado del pedido."
      />

      {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[520px,1fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">Registrar venta</h3>
                <p className="mt-1 text-sm text-stone-500">
                  Sumá varios productos y confirmalos todos juntos.
                </p>
              </div>
              <Button className="px-4" onClick={addItem} type="button">
                Agregar producto
              </Button>
            </div>

            <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
              <div>
                <Label>Cliente</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.customer_id}
                    onChange={(event) => handleCustomerChange(event.target.value)}
                  >
                    <option value="">Sin cliente asociado</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    className="shrink-0 px-4"
                    onClick={() => setShowCustomerForm((current) => !current)}
                    type="button"
                  >
                    {showCustomerForm ? "Cerrar" : "Nuevo"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estado del pedido</Label>
                  <Select
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value as SaleStatus })
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label>Canal de compra</Label>
                  <Select
                    value={form.channel}
                    onChange={(event) => setForm({ ...form, channel: event.target.value })}
                  >
                    <option value="">Seleccionar</option>
                    <option value="Tiendanube">Tiendanube</option>
                    <option value="Instagram">Instagram</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Mostrador">Mostrador</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                {itemSummaries.map((entry, index) => (
                  <div key={`${entry.item.product_id}-${index}`} className="rounded-2xl border border-stone-200 p-4">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <p className="text-sm font-medium text-stone-900">Producto {index + 1}</p>
                      {form.items.length > 1 ? (
                        <Button
                          className="h-9 bg-red-600 px-4 hover:bg-red-700"
                          onClick={() => removeItem(index)}
                          type="button"
                        >
                          Quitar
                        </Button>
                      ) : null}
                    </div>

                    <div>
                      <Label>Producto</Label>
                      <Select
                        required
                        value={entry.item.product_id}
                        onChange={(event) => updateItem(index, { product_id: event.target.value })}
                      >
                        <option value="">Seleccionar</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - Stock {Number(product.current_stock)} {product.unit}
                          </option>
                        ))}
                      </Select>
                      {entry.product?.category?.package_size ? (
                        <p className="mt-2 text-xs text-stone-500">
                          Se trabaja en {entry.product.unit}. Referencia de paquete: {Number(entry.product.category.package_size)} {entry.product.unit}.
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <Label>Cantidad en kg</Label>
                        <Input
                          required
                          min={0.01}
                          step="0.01"
                          type="number"
                          value={entry.item.quantity}
                          onChange={(event) =>
                            updateItem(index, { quantity: Number(event.target.value) })
                          }
                        />
                      </div>

                      <div>
                        <Label>Precio base por kg</Label>
                        <Input
                          required
                          min={0}
                          step="0.01"
                          type="number"
                          value={entry.item.unit_price}
                          onChange={(event) =>
                            updateItem(index, { unit_price: Number(event.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
                      <div className="flex items-center justify-between">
                        <span>Descuento aplicado</span>
                        <strong>{entry.discountPercent}%</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Precio final por kg</span>
                        <strong>{formatCurrency(entry.finalUnitPrice)}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <strong>{formatCurrency(entry.lineTotal)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-stone-700">
                <div className="flex items-center justify-between">
                  <span>Total de kilos</span>
                  <strong>{totalKg} kg</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total estimado</span>
                  <strong>{formatCurrency(totalAmount)}</strong>
                </div>
                <p className="text-xs text-stone-500">
                  El descuento se calcula por producto según la cantidad cargada en cada línea.
                </p>
              </div>

              <Button disabled={saving} type="submit">
                {saving ? "Guardando..." : "Confirmar venta"}
              </Button>
            </form>
          </Card>

          {showCustomerForm ? (
            <Card>
              <h3 className="text-lg font-semibold text-stone-900">Nuevo cliente</h3>

              <form className="mt-5 space-y-4" onSubmit={handleCreateCustomer}>
                <div>
                  <Label>Nombre</Label>
                  <Input
                    required
                    value={customerForm.name}
                    onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })}
                  />
                </div>

                <div>
                  <Label>Direccion</Label>
                  <Input
                    value={customerForm.address}
                    onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Provincia</Label>
                    <Input
                      value={customerForm.province}
                      onChange={(event) => setCustomerForm({ ...customerForm, province: event.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Telefono</Label>
                    <Input
                      value={customerForm.phone}
                      onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Transporte</Label>
                  <Input
                    placeholder="Andreani, Via Cargo, transporte local..."
                    value={customerForm.transport}
                    onChange={(event) =>
                      setCustomerForm({ ...customerForm, transport: event.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Medio de pago</Label>
                    <Input
                      value={customerForm.payment_method}
                      onChange={(event) =>
                        setCustomerForm({ ...customerForm, payment_method: event.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Canal</Label>
                    <Select
                      value={customerForm.purchase_channel}
                      onChange={(event) =>
                        setCustomerForm({ ...customerForm, purchase_channel: event.target.value })
                      }
                    >
                      <option value="">Seleccionar</option>
                      <option value="Tiendanube">Tiendanube</option>
                      <option value="Instagram">Instagram</option>
                      <option value="WhatsApp">WhatsApp</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Que compro / interes</Label>
                  <Textarea
                    value={customerForm.products_of_interest}
                    onChange={(event) =>
                      setCustomerForm({ ...customerForm, products_of_interest: event.target.value })
                    }
                  />
                </div>

                <Button disabled={savingCustomer} type="submit">
                  {savingCustomer ? "Guardando..." : "Crear cliente"}
                </Button>
              </form>
            </Card>
          ) : null}
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-5 py-4 font-medium">Fecha</th>
                  <th className="px-5 py-4 font-medium">Cliente</th>
                  <th className="px-5 py-4 font-medium">Producto</th>
                  <th className="px-5 py-4 font-medium">Cantidad</th>
                  <th className="px-5 py-4 font-medium">Desc.</th>
                  <th className="px-5 py-4 font-medium">Estado</th>
                  <th className="px-5 py-4 font-medium">Precio/kg</th>
                  <th className="px-5 py-4 font-medium">Total</th>
                  <th className="px-5 py-4 font-medium">Canal</th>
                  <th className="px-5 py-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-t border-stone-100">
                    <td className="px-5 py-4 text-stone-600">{formatDate(sale.created_at)}</td>
                    <td className="px-5 py-4 text-stone-600">
                      {sale.client?.name || sale.customer || "-"}
                    </td>
                    <td className="px-5 py-4 font-medium text-stone-900">{sale.product?.name}</td>
                    <td className="px-5 py-4 text-stone-600">
                      {Number(sale.quantity)} {sale.product?.unit}
                    </td>
                    <td className="px-5 py-4 text-stone-600">{Number(sale.discount_percent)}%</td>
                    <td className="px-5 py-4 text-stone-600">
                      {STATUS_OPTIONS.find((option) => option.value === sale.status)?.label ?? sale.status}
                    </td>
                    <td className="px-5 py-4 text-stone-600">{formatCurrency(Number(sale.unit_price))}</td>
                    <td className="px-5 py-4 text-stone-600">{formatCurrency(Number(sale.total))}</td>
                    <td className="px-5 py-4 text-stone-600">{sale.channel || "-"}</td>
                    <td className="px-5 py-4">
                      <Button
                        className="h-9 bg-red-600 px-4 hover:bg-red-700"
                        onClick={() => handleDelete(sale.id)}
                        type="button"
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
}
