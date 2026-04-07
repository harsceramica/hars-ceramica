"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { Select } from "@/components/ui";
import { getSales, updateSaleStatus } from "@/lib/services/sales";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SaleStatus, SaleWithProduct } from "@/types";

const STATUS_OPTIONS: Array<{ value: SaleStatus; label: string }> = [
  { value: "pendiente_de_pago", label: "Pendiente de pago" },
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
  { value: "por_despachar", label: "Por despachar" },
  { value: "despachado", label: "Despachado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

const VISIBLE_COLUMNS: SaleStatus[] = [
  "pendiente_de_pago",
  "pagado",
  "por_despachar",
  "despachado",
  "entregado",
];

function getStatusLabel(status: SaleStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function OrdersView() {
  const [sales, setSales] = useState<SaleWithProduct[]>([]);
  const [error, setError] = useState("");

  async function loadSales() {
    try {
      setError("");
      const response = await getSales();
      setSales(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los pedidos.");
    }
  }

  useEffect(() => {
    void loadSales();
  }, []);

  async function handleStatusChange(id: string, status: SaleStatus) {
    try {
      setError("");
      await updateSaleStatus(id, status);
      await loadSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado.");
    }
  }

  const groupedSales = useMemo(() => {
    return VISIBLE_COLUMNS.map((status) => ({
      status,
      label: getStatusLabel(status),
      items: sales.filter((sale) => sale.status === status),
    }));
  }, [sales]);

  return (
    <section>
      <PageHeader
        title="Pedidos"
        description="Seguimiento operativo de ventas por etapa: pago, despacho y entrega."
      />

      {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-5">
        {groupedSales.map((column) => (
          <Card key={column.status} className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-stone-900">{column.label}</h3>
              <p className="mt-1 text-xs text-stone-500">{column.items.length} pedidos</p>
            </div>

            <div className="space-y-3">
              {column.items.map((sale) => (
                <div key={sale.id} className="rounded-2xl border border-stone-200 p-4">
                  <p className="text-sm font-semibold text-stone-900">
                    {sale.client?.name || sale.customer || "Cliente sin nombre"}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">{sale.product?.name}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {Number(sale.quantity)} {sale.product?.unit} · {formatCurrency(Number(sale.total))}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">{formatDate(sale.created_at)}</p>
                  <div className="mt-3">
                    <Select
                      value={sale.status}
                      onChange={(event) =>
                        handleStatusChange(sale.id, event.target.value as SaleStatus)
                      }
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}

              {column.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 p-4 text-sm text-stone-500">
                  Sin pedidos en esta etapa.
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
