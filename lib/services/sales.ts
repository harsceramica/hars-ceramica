import { supabase } from "@/lib/supabaseClient";
import type { Sale, SaleFormValues, SaleStatus, SaleWithProduct } from "@/types";

export async function getSales(): Promise<SaleWithProduct[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*, product:products(id, name, unit), client:customers(id, name, phone, province, purchase_channel, total_spent)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SaleWithProduct[];
}

export async function createSale(values: SaleFormValues): Promise<Sale> {
  const { data, error } = await supabase.rpc("create_sale", {
    p_product_id: values.product_id,
    p_quantity: values.quantity,
    p_unit_price: values.unit_price,
    p_customer_id: values.customer_id ?? null,
    p_status: values.status,
    p_customer: values.customer ?? null,
    p_channel: values.channel ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteSale(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_sale_and_restore_stock", {
    p_sale_id: id,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateSaleStatus(id: string, status: SaleStatus): Promise<Sale> {
  const { data, error } = await supabase
    .from("sales")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
