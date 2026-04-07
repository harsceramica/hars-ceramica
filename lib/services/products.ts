import { supabase } from "@/lib/supabaseClient";
import type { Product, ProductFormValues, ProductWithCategory } from "@/types";

export async function getProducts(includeInactive = false): Promise<ProductWithCategory[]> {
  let query = supabase
    .from("products")
    .select("*, category:product_categories(*)")
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProductWithCategory[];
}

export async function createProduct(values: ProductFormValues): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert(values)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateProduct(id: string, values: Partial<ProductFormValues>): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
