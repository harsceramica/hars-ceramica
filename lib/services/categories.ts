import { supabase } from "@/lib/supabaseClient";
import type { ProductCategory } from "@/types";

export async function getCategories(): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
