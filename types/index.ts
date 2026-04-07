import type { Database } from "./database";

export type ProductCategory = Database["public"]["Tables"]["product_categories"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];

export type ProductWithCategory = Product & {
  category: ProductCategory;
};

export type SaleWithProduct = Sale & {
  product: Pick<Product, "id" | "name" | "unit">;
  client?: Pick<Customer, "id" | "name" | "phone" | "province" | "purchase_channel" | "total_spent"> | null;
};

export type StockMovementWithProduct = StockMovement & {
  product: Pick<Product, "id" | "name" | "unit">;
};

export type CustomerWithStats = Customer & {
  sales_count: number;
};

export type DashboardMetrics = {
  stockValue: number;
  monthlySales: number;
  monthlyExpenses: number;
  monthlyProfit: number;
};

export type SaleStatus =
  | "pendiente_de_pago"
  | "pendiente"
  | "pagado"
  | "por_despachar"
  | "despachado"
  | "entregado"
  | "cancelado";

export type ProductFormValues = {
  name: string;
  sku?: string;
  category_id: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost: number;
  price: number;
  is_active: boolean;
};

export type SaleFormValues = {
  product_id: string;
  customer_id?: string;
  status: SaleStatus;
  quantity: number;
  unit_price: number;
  customer?: string;
  channel?: string;
};

export type StockMovementFormValues = {
  product_id: string;
  type: "entrada" | "salida" | "ajuste";
  quantity: number;
  note?: string;
};

export type ExpenseFormValues = {
  concept: string;
  category: string;
  amount: number;
  payment_method?: string;
};

export type CustomerFormValues = {
  name: string;
  address?: string;
  province?: string;
  phone?: string;
  transport?: string;
  payment_method?: string;
  purchase_channel?: string;
  products_of_interest?: string;
};

export type ImportCsvResult = {
  imported: number;
  skipped: number;
  customersCreated: number;
  warnings: string[];
};
