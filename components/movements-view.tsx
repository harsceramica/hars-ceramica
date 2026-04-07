"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { getProducts } from "@/lib/services/products";
import { createMovement, getMovements } from "@/lib/services/stock";
import { formatDate } from "@/lib/utils";
import type {
  ProductWithCategory,
  StockMovementFormValues,
  StockMovementWithProduct,
} from "@/types";

const initialForm: StockMovementFormValues = {
  product_id: "",
  type: "entrada",
  quantity: 0,
  note: "",
};

export function MovementsView() {
  const [movements, setMovements] = useState<StockMovementWithProduct[]>([]);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [form, setForm] = useState<StockMovementFormValues>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setError("");
      const [movementsResponse, productsResponse] = await Promise.all([
        getMovements(),
        getProducts(),
      ]);
      setMovements(movementsResponse);
      setProducts(productsResponse);
      setForm((current) => ({
        ...current,
        product_id: current.product_id || productsResponse[0]?.id || "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los movimientos.");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      await createMovement(form);
      await loadData();
      setForm({
        ...initialForm,
        product_id: products[0]?.id ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el movimiento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Movimientos de stock"
        description="Registra entradas, salidas y ajustes con actualizacion automatica del stock."
      />

      {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
        <Card>
          <h3 className="text-lg font-semibold text-stone-900">Nuevo movimiento</h3>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label>Producto</Label>
              <Select
                required
                value={form.product_id}
                onChange={(event) => setForm({ ...form, product_id: event.target.value })}
              >
                <option value="">Seleccionar</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - Stock {Number(product.current_stock)} {product.unit}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      type: event.target.value as StockMovementFormValues["type"],
                    })
                  }
                >
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                  <option value="ajuste">Ajuste</option>
                </Select>
              </div>

              <div>
                <Label>{form.type === "ajuste" ? "Stock final" : "Cantidad"}</Label>
                <Input
                  required
                  min={0.01}
                  step="0.01"
                  type="number"
                  value={form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Nota</Label>
              <Textarea
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </div>

            <Button disabled={saving} type="submit">
              {saving ? "Guardando..." : "Guardar movimiento"}
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-5 py-4 font-medium">Fecha</th>
                  <th className="px-5 py-4 font-medium">Producto</th>
                  <th className="px-5 py-4 font-medium">Tipo</th>
                  <th className="px-5 py-4 font-medium">Cantidad</th>
                  <th className="px-5 py-4 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-t border-stone-100">
                    <td className="px-5 py-4 text-stone-600">{formatDate(movement.created_at)}</td>
                    <td className="px-5 py-4 font-medium text-stone-900">
                      {movement.product?.name}
                    </td>
                    <td className="px-5 py-4 text-stone-600">{movement.type}</td>
                    <td className="px-5 py-4 text-stone-600">
                      {Number(movement.quantity)} {movement.product?.unit}
                    </td>
                    <td className="px-5 py-4 text-stone-600">{movement.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
}
