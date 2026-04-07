"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { Button, Input, Label } from "@/components/ui";
import { createExpense, getExpenses } from "@/lib/services/expenses";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense, ExpenseFormValues } from "@/types";

const initialForm: ExpenseFormValues = {
  concept: "",
  category: "",
  amount: 0,
  payment_method: "",
};

export function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState<ExpenseFormValues>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setError("");
      const response = await getExpenses();
      setExpenses(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los gastos.");
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
      await createExpense(form);
      await loadData();
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el gasto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Gastos"
        description="Control de egresos del negocio para impactar directamente en la rentabilidad."
      />

      {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
        <Card>
          <h3 className="text-lg font-semibold text-stone-900">Nuevo gasto</h3>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label>Concepto</Label>
              <Input
                required
                value={form.concept}
                onChange={(event) => setForm({ ...form, concept: event.target.value })}
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Input
                required
                placeholder="Servicios, insumos, alquiler..."
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              />
            </div>

            <div>
              <Label>Monto</Label>
              <Input
                required
                min={0.01}
                step="0.01"
                type="number"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })}
              />
            </div>

            <div>
              <Label>Metodo de pago</Label>
              <Input
                value={form.payment_method}
                onChange={(event) => setForm({ ...form, payment_method: event.target.value })}
              />
            </div>

            <Button disabled={saving} type="submit">
              {saving ? "Guardando..." : "Guardar gasto"}
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-5 py-4 font-medium">Fecha</th>
                  <th className="px-5 py-4 font-medium">Concepto</th>
                  <th className="px-5 py-4 font-medium">Categoria</th>
                  <th className="px-5 py-4 font-medium">Monto</th>
                  <th className="px-5 py-4 font-medium">Pago</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-stone-100">
                    <td className="px-5 py-4 text-stone-600">{formatDate(expense.created_at)}</td>
                    <td className="px-5 py-4 font-medium text-stone-900">{expense.concept}</td>
                    <td className="px-5 py-4 text-stone-600">{expense.category}</td>
                    <td className="px-5 py-4 text-stone-600">{formatCurrency(Number(expense.amount))}</td>
                    <td className="px-5 py-4 text-stone-600">{expense.payment_method || "-"}</td>
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
