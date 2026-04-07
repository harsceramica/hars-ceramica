import { supabase } from "@/lib/supabaseClient";
import type { Expense, ExpenseFormValues } from "@/types";

export async function createExpense(values: ExpenseFormValues): Promise<Expense> {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      concept: values.concept,
      category: values.category,
      amount: values.amount,
      payment_method: values.payment_method ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
