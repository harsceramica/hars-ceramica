import { supabase } from "@/lib/supabaseClient";
import { getMonthRange } from "@/lib/utils";
import type {
  DashboardData,
  DashboardMetrics,
  DashboardRecentExpense,
  DashboardRecentSale,
  DashboardStockItem,
} from "@/types";
import type { Database } from "@/types/database";

type ProductMetricRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  "id" | "name" | "current_stock" | "cost" | "unit"
>;

type SaleMetricRow = Pick<
  Database["public"]["Tables"]["sales"]["Row"],
  "id" | "total" | "profit" | "created_at" | "quantity" | "customer" | "channel"
> & {
  product: Pick<Database["public"]["Tables"]["products"]["Row"], "name" | "unit"> | null;
};

type ExpenseMetricRow = Pick<
  Database["public"]["Tables"]["expenses"]["Row"],
  "id" | "concept" | "category" | "amount" | "payment_method" | "created_at"
>;

function buildMetrics(
  products: ProductMetricRow[],
  sales: SaleMetricRow[],
  expenses: ExpenseMetricRow[],
): DashboardMetrics {
  const stockValue = products.reduce((sum, item) => {
    return sum + Number(item.current_stock) * Number(item.cost);
  }, 0);

  const monthlySales = sales.reduce((sum, item) => sum + Number(item.total), 0);
  const monthlyExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const salesProfit = sales.reduce((sum, item) => sum + Number(item.profit), 0);

  return {
    stockValue,
    monthlySales,
    monthlyExpenses,
    monthlyProfit: salesProfit - monthlyExpenses,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const { start, end } = getMonthRange();

  const [
    { data: products, error: productsError },
    { data: monthlySales, error: monthlySalesError },
    { data: monthlyExpenses, error: monthlyExpensesError },
    { data: recentSales, error: recentSalesError },
    { data: recentExpenses, error: recentExpensesError },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, current_stock, cost, unit")
      .eq("is_active", true)
      .order("current_stock", { ascending: false }),
    supabase
      .from("sales")
      .select("id, total, profit, created_at, quantity, customer, channel, product:products(name, unit)")
      .gte("created_at", start)
      .lt("created_at", end),
    supabase
      .from("expenses")
      .select("id, concept, category, amount, payment_method, created_at")
      .gte("created_at", start)
      .lt("created_at", end),
    supabase
      .from("sales")
      .select("id, total, profit, created_at, quantity, customer, channel, product:products(name, unit)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("expenses")
      .select("id, concept, category, amount, payment_method, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (productsError) {
    throw new Error(productsError.message);
  }

  if (monthlySalesError) {
    throw new Error(monthlySalesError.message);
  }

  if (monthlyExpensesError) {
    throw new Error(monthlyExpensesError.message);
  }

  if (recentSalesError) {
    throw new Error(recentSalesError.message);
  }

  if (recentExpensesError) {
    throw new Error(recentExpensesError.message);
  }

  const productRows = (products ?? []) as ProductMetricRow[];
  const monthlySaleRows = (monthlySales ?? []) as SaleMetricRow[];
  const monthlyExpenseRows = (monthlyExpenses ?? []) as ExpenseMetricRow[];
  const recentSaleRows = (recentSales ?? []) as SaleMetricRow[];
  const recentExpenseRows = (recentExpenses ?? []) as ExpenseMetricRow[];

  const stockRanking: DashboardStockItem[] = productRows.slice(0, 8).map((item) => ({
    id: item.id,
    name: item.name,
    stock: Number(item.current_stock),
    unit: item.unit,
  }));

  const mappedRecentSales: DashboardRecentSale[] = recentSaleRows.map((sale) => ({
    id: sale.id,
    created_at: sale.created_at,
    total: Number(sale.total),
    quantity: Number(sale.quantity),
    customer: sale.customer,
    channel: sale.channel,
    product: {
      name: sale.product?.name ?? "Producto",
      unit: sale.product?.unit ?? "kg",
    },
  }));

  const mappedRecentExpenses: DashboardRecentExpense[] = recentExpenseRows.map((expense) => ({
    id: expense.id,
    created_at: expense.created_at,
    concept: expense.concept,
    category: expense.category,
    amount: Number(expense.amount),
    payment_method: expense.payment_method,
  }));

  return {
    metrics: buildMetrics(productRows, monthlySaleRows, monthlyExpenseRows),
    stockRanking,
    recentSales: mappedRecentSales,
    recentExpenses: mappedRecentExpenses,
  };
}
