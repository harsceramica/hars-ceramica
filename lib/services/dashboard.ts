import { supabase } from "@/lib/supabaseClient";
import { getMonthRange } from "@/lib/utils";
import type { DashboardMetrics } from "@/types";
import type { Database } from "@/types/database";

type ProductMetricRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  "current_stock" | "cost"
>;

type SaleMetricRow = Pick<
  Database["public"]["Tables"]["sales"]["Row"],
  "total" | "profit"
>;

type ExpenseMetricRow = Pick<
  Database["public"]["Tables"]["expenses"]["Row"],
  "amount"
>;

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const { start, end } = getMonthRange();

  const [{ data: products, error: productsError }, { data: sales, error: salesError }, { data: expenses, error: expensesError }] =
    await Promise.all([
      supabase.from("products").select("current_stock, cost").eq("is_active", true),
      supabase
        .from("sales")
        .select("total, profit")
        .gte("created_at", start)
        .lt("created_at", end),
      supabase
        .from("expenses")
        .select("amount")
        .gte("created_at", start)
        .lt("created_at", end),
    ]);

  if (productsError) {
    throw new Error(productsError.message);
  }

  if (salesError) {
    throw new Error(salesError.message);
  }

  if (expensesError) {
    throw new Error(expensesError.message);
  }

  const productRows = (products ?? []) as ProductMetricRow[];
  const saleRows = (sales ?? []) as SaleMetricRow[];
  const expenseRows = (expenses ?? []) as ExpenseMetricRow[];

  const stockValue = productRows.reduce((sum, item) => {
    return sum + Number(item.current_stock) * Number(item.cost);
  }, 0);

  const monthlySales = saleRows.reduce((sum, item) => sum + Number(item.total), 0);
  const monthlyExpenses = expenseRows.reduce((sum, item) => sum + Number(item.amount), 0);
  const salesProfit = saleRows.reduce((sum, item) => sum + Number(item.profit), 0);

  return {
    stockValue,
    monthlySales,
    monthlyExpenses,
    monthlyProfit: salesProfit - monthlyExpenses,
  };
}
