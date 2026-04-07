import { supabase } from "@/lib/supabaseClient";
import type { Customer, CustomerFormValues, CustomerWithStats } from "@/types";

export async function getCustomers(): Promise<CustomerWithStats[]> {
  const [{ data: customers, error: customersError }, { data: sales, error: salesError }] =
    await Promise.all([
      supabase.from("customers").select("*").order("name", { ascending: true }),
      supabase.from("sales").select("customer_id"),
    ]);

  if (customersError) {
    throw new Error(customersError.message);
  }

  if (salesError) {
    throw new Error(salesError.message);
  }

  const salesCountByCustomer = new Map<string, number>();

  (sales ?? []).forEach((sale) => {
    if (!sale.customer_id) {
      return;
    }

    salesCountByCustomer.set(
      sale.customer_id,
      (salesCountByCustomer.get(sale.customer_id) ?? 0) + 1,
    );
  });

  return (customers ?? []).map((customer) => ({
    ...customer,
    sales_count: salesCountByCustomer.get(customer.id) ?? 0,
  }));
}

export async function createCustomer(values: CustomerFormValues): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: values.name,
      address: values.address ?? null,
      province: values.province ?? null,
      phone: values.phone ?? null,
      payment_method: values.payment_method ?? null,
      purchase_channel: values.purchase_channel ?? null,
      products_of_interest: values.products_of_interest ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
