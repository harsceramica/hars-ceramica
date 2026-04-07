import { supabase } from "@/lib/supabaseClient";
import type {
  StockMovement,
  StockMovementFormValues,
  StockMovementWithProduct,
} from "@/types";

export async function getMovements(): Promise<StockMovementWithProduct[]> {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*, product:products(id, name, unit)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StockMovementWithProduct[];
}

export async function createMovement(values: StockMovementFormValues): Promise<StockMovement> {
  const { data, error } = await supabase.rpc("create_stock_movement", {
    p_product_id: values.product_id,
    p_type: values.type,
    p_quantity: values.quantity,
    p_note: values.note ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
