"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/card";
import { getDashboardData } from "@/lib/services/dashboard";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardData } from "@/types";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";

const emptyDashboard: DashboardData = {
  metrics: {
    stockValue: 0,
    monthlySales: 0,
    monthlyExpenses: 0,
    monthlyProfit: 0,
  },
  stockRanking: [],
  recentSales: [],
  recentExpenses: [],
};

export function DashboardView() {
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        setError("");
        const response = await getDashboardData();
        setDashboard(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard.");
      } finally {
        setLoading(false);
      }
    }

    void loadMetrics();
  }, []);

  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Vista general de stock, ventas, gastos y rentabilidad del mes actual."
      />

      {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Valor stock"
          value={loading ? "..." : formatCurrency(dashboard.metrics.stockValue)}
        />
        <MetricCard
          label="Ventas del mes"
          value={loading ? "..." : formatCurrency(dashboard.metrics.monthlySales)}
        />
        <MetricCard
          label="Gastos del mes"
          value={loading ? "..." : formatCurrency(dashboard.metrics.monthlyExpenses)}
        />
        <MetricCard
          label="Ganancia"
          value={loading ? "..." : formatCurrency(dashboard.metrics.monthlyProfit)}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Stock por arcilla</h3>
              <p className="mt-1 text-sm text-stone-500">
                Ranking de productos desde mayor a menor stock actual.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {dashboard.stockRanking.map((item) => {
              const maxStock = Math.max(...dashboard.stockRanking.map((stockItem) => stockItem.stock), 1);
              const width = `${Math.max((item.stock / maxStock) * 100, 8)}%`;

              return (
                <div key={item.id}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-800">{item.name}</span>
                    <span className="text-stone-500">
                      {item.stock} {item.unit}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-stone-100">
                    <div className="h-3 rounded-full bg-brand-700 transition-all" style={{ width }} />
                  </div>
                </div>
              );
            })}

            {!loading && dashboard.stockRanking.length === 0 ? (
              <p className="text-sm text-stone-500">No hay productos para mostrar.</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-stone-900">Resumen visual</h3>
          <p className="mt-1 text-sm text-stone-500">
            Comparación rápida entre ventas, gastos y ganancia del mes.
          </p>

          <div className="mt-6 space-y-4">
            {[
              { label: "Ventas", value: dashboard.metrics.monthlySales, color: "bg-emerald-500" },
              { label: "Gastos", value: dashboard.metrics.monthlyExpenses, color: "bg-amber-500" },
              { label: "Ganancia", value: dashboard.metrics.monthlyProfit, color: "bg-brand-700" },
            ].map((item, index, array) => {
              const maxValue = Math.max(...array.map((entry) => Math.abs(entry.value)), 1);
              const width = `${Math.max((Math.abs(item.value) / maxValue) * 100, 6)}%`;

              return (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-800">{item.label}</span>
                    <span className="text-stone-500">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-stone-100">
                    <div className={`h-3 rounded-full ${item.color}`} style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-stone-900">Últimas ventas</h3>
          <div className="mt-4 space-y-3">
            {dashboard.recentSales.map((sale) => (
              <div key={sale.id} className="rounded-2xl border border-stone-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-stone-900">{sale.product.name}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {sale.quantity} {sale.product.unit} · {sale.customer || "Sin cliente"}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      {sale.channel || "Sin canal"} · {formatDate(sale.created_at)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-stone-900">
                    {formatCurrency(sale.total)}
                  </p>
                </div>
              </div>
            ))}

            {!loading && dashboard.recentSales.length === 0 ? (
              <p className="text-sm text-stone-500">Todavía no hay ventas registradas.</p>
            ) : null}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-stone-900">Últimos gastos</h3>
          <div className="mt-4 space-y-3">
            {dashboard.recentExpenses.map((expense) => (
              <div key={expense.id} className="rounded-2xl border border-stone-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-stone-900">{expense.concept}</p>
                    <p className="mt-1 text-sm text-stone-500">{expense.category}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      {expense.payment_method || "Sin método"} · {formatDate(expense.created_at)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-stone-900">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
              </div>
            ))}

            {!loading && dashboard.recentExpenses.length === 0 ? (
              <p className="text-sm text-stone-500">Todavía no hay gastos registrados.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </section>
  );
}
