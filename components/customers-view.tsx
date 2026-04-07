"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { getCustomers } from "@/lib/services/customers";
import { formatCurrency } from "@/lib/utils";
import type { CustomerWithStats } from "@/types";

export function CustomersView() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      try {
        setError("");
        const response = await getCustomers();
        setCustomers(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los clientes.");
      }
    }

    void loadCustomers();
  }, []);

  return (
    <section>
      <PageHeader
        title="Clientes"
        description="CRM basico con datos de contacto, canal y total comprado por cada cliente."
      />

      {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="px-5 py-4 font-medium">Nombre</th>
                <th className="px-5 py-4 font-medium">Telefono</th>
                <th className="px-5 py-4 font-medium">Provincia</th>
                <th className="px-5 py-4 font-medium">Medio de pago</th>
                <th className="px-5 py-4 font-medium">Canal</th>
                <th className="px-5 py-4 font-medium">Que compra</th>
                <th className="px-5 py-4 font-medium">Compras</th>
                <th className="px-5 py-4 font-medium">Total comprado</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-t border-stone-100">
                  <td className="px-5 py-4 font-medium text-stone-900">{customer.name}</td>
                  <td className="px-5 py-4 text-stone-600">{customer.phone || "-"}</td>
                  <td className="px-5 py-4 text-stone-600">{customer.province || "-"}</td>
                  <td className="px-5 py-4 text-stone-600">{customer.payment_method || "-"}</td>
                  <td className="px-5 py-4 text-stone-600">{customer.purchase_channel || "-"}</td>
                  <td className="px-5 py-4 text-stone-600">{customer.products_of_interest || "-"}</td>
                  <td className="px-5 py-4 text-stone-600">{customer.sales_count}</td>
                  <td className="px-5 py-4 text-stone-600">{formatCurrency(Number(customer.total_spent))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
