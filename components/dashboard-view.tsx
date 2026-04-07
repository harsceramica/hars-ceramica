"use client";

import { useEffect, useState } from "react";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "@/types";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";

const emptyMetrics: DashboardMetrics = {
  stockValue: 0,
  monthlySales: 0,
  monthlyExpenses: 0,
  monthlyProfit: 0,
};

export function DashboardView() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        setError("");
        const response = await getDashboardMetrics();
        setMetrics(response);
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
        <MetricCard label="Valor stock" value={loading ? "..." : formatCurrency(metrics.stockValue)} />
        <MetricCard label="Ventas del mes" value={loading ? "..." : formatCurrency(metrics.monthlySales)} />
        <MetricCard label="Gastos del mes" value={loading ? "..." : formatCurrency(metrics.monthlyExpenses)} />
        <MetricCard label="Ganancia" value={loading ? "..." : formatCurrency(metrics.monthlyProfit)} />
      </div>
    </section>
  );
}
