"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { Button, Input, Label } from "@/components/ui";
import type { ImportCsvResult } from "@/types";

export function ImportsView() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportCsvResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Seleccioná un CSV para importar.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/imports/tiendanube-sales", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ImportCsvResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo importar el archivo.");
      }

      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar el CSV.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Importar CSV"
        description="Subí el resumen de ventas de Tiendanube para crear ventas, clientes y pedidos sin cargar todo a mano."
      />

      {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
        <Card>
          <h3 className="text-lg font-semibold text-stone-900">Ventas de Tiendanube</h3>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label>Archivo CSV</Label>
              <Input
                accept=".csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </div>

            <Button disabled={loading} type="submit">
              {loading ? "Importando..." : "Importar archivo"}
            </Button>
          </form>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-stone-900">Resultado</h3>

          {result ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-stone-50 p-4">
                  <p className="text-sm text-stone-500">Ventas importadas</p>
                  <p className="mt-2 text-3xl font-semibold text-stone-900">{result.imported}</p>
                </div>
                <div className="rounded-2xl bg-stone-50 p-4">
                  <p className="text-sm text-stone-500">Filas salteadas</p>
                  <p className="mt-2 text-3xl font-semibold text-stone-900">{result.skipped}</p>
                </div>
                <div className="rounded-2xl bg-stone-50 p-4">
                  <p className="text-sm text-stone-500">Clientes creados</p>
                  <p className="mt-2 text-3xl font-semibold text-stone-900">{result.customersCreated}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-stone-700">Advertencias</p>
                <div className="mt-3 space-y-2">
                  {result.warnings.length > 0 ? (
                    result.warnings.map((warning, index) => (
                      <p key={`${warning}-${index}`} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        {warning}
                      </p>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Importación sin advertencias.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-stone-600">
              Cuando subas un archivo vas a ver acá el resumen de lo importado.
            </p>
          )}
        </Card>
      </div>
    </section>
  );
}
