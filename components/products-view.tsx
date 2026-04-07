"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { Button, Input, Label, Select } from "@/components/ui";
import { getCategories } from "@/lib/services/categories";
import { createProduct, deleteProduct, getProducts, updateProduct } from "@/lib/services/products";
import { formatCurrency } from "@/lib/utils";
import type { ProductCategory, ProductFormValues, ProductWithCategory } from "@/types";

const initialForm: ProductFormValues = {
  name: "",
  category_id: "",
  unit: "kg",
  current_stock: 0,
  min_stock: 0,
  cost: 0,
  price: 0,
  is_active: true,
};

export function ProductsView() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [form, setForm] = useState<ProductFormValues>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      setError("");
      const [productsResponse, categoriesResponse] = await Promise.all([
        getProducts(true),
        getCategories(),
      ]);

      setProducts(productsResponse);
      setCategories(categoriesResponse);
      setForm((current) => ({
        ...current,
        category_id: current.category_id || categoriesResponse[0]?.id || "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los productos.");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetForm(defaultCategoryId?: string) {
    const nextCategoryId = defaultCategoryId ?? categories[0]?.id ?? "";
    const category = categories.find((item) => item.id === nextCategoryId);

    setEditingId(null);
    setForm({
      ...initialForm,
      category_id: nextCategoryId,
      cost: Number(category?.default_cost ?? 0),
      price: Number(category?.default_price ?? 0),
    });
  }

  function handleCategoryChange(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId);

    setForm((current) => ({
      ...current,
      category_id: categoryId,
      cost: editingId ? current.cost : Number(category?.default_cost ?? 0),
      price: editingId ? current.price : Number(category?.default_price ?? 0),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editingId) {
        await updateProduct(editingId, form);
      } else {
        await createProduct(form);
      }

      await loadData();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setError("");
      await deleteProduct(id);
      await loadData();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar el producto.");
    }
  }

  function startEdit(product: ProductWithCategory) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category_id: product.category_id,
      unit: product.unit,
      current_stock: Number(product.current_stock),
      min_stock: Number(product.min_stock),
      cost: Number(product.cost),
      price: Number(product.price),
      is_active: product.is_active,
    });
  }

  return (
    <section>
      <PageHeader
        title="Productos"
        description="Gestiona categorias y productos sin hardcodear la logica por tipo."
      />

      {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
        <Card>
          <h3 className="text-lg font-semibold text-stone-900">
            {editingId ? "Editar producto" : "Nuevo producto"}
          </h3>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label>Nombre</Label>
              <Input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select
                required
                value={form.category_id}
                onChange={(event) => handleCategoryChange(event.target.value)}
              >
                <option value="">Seleccionar</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unidad</Label>
                <Input
                  required
                  value={form.unit}
                  onChange={(event) => setForm({ ...form, unit: event.target.value })}
                />
              </div>

              <div>
                <Label>Stock actual</Label>
                <Input
                  required
                  min={0}
                  step="0.01"
                  type="number"
                  value={form.current_stock}
                  onChange={(event) =>
                    setForm({ ...form, current_stock: Number(event.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Stock minimo</Label>
                <Input
                  required
                  min={0}
                  step="0.01"
                  type="number"
                  value={form.min_stock}
                  onChange={(event) => setForm({ ...form, min_stock: Number(event.target.value) })}
                />
              </div>

              <div>
                <Label>Costo</Label>
                <Input
                  required
                  min={0}
                  step="0.01"
                  type="number"
                  value={form.cost}
                  onChange={(event) => setForm({ ...form, cost: Number(event.target.value) })}
                />
              </div>

              <div>
                <Label>Precio</Label>
                <Input
                  required
                  min={0}
                  step="0.01"
                  type="number"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: Number(event.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Estado</Label>
              <Select
                value={form.is_active ? "true" : "false"}
                onChange={(event) =>
                  setForm({ ...form, is_active: event.target.value === "true" })
                }
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button disabled={saving} type="submit">
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </Button>
              <Button
                className="bg-stone-200 text-stone-900 hover:bg-stone-300"
                onClick={() => resetForm()}
                type="button"
              >
                Limpiar
              </Button>
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-5 py-4 font-medium">Producto</th>
                  <th className="px-5 py-4 font-medium">Categoria</th>
                  <th className="px-5 py-4 font-medium">Stock</th>
                  <th className="px-5 py-4 font-medium">Costo</th>
                  <th className="px-5 py-4 font-medium">Precio</th>
                  <th className="px-5 py-4 font-medium">Estado</th>
                  <th className="px-5 py-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-stone-100">
                    <td className="px-5 py-4 font-medium text-stone-900">{product.name}</td>
                    <td className="px-5 py-4 text-stone-600">{product.category?.name}</td>
                    <td className="px-5 py-4 text-stone-600">
                      {Number(product.current_stock)} {product.unit}
                    </td>
                    <td className="px-5 py-4 text-stone-600">{formatCurrency(Number(product.cost))}</td>
                    <td className="px-5 py-4 text-stone-600">{formatCurrency(Number(product.price))}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          product.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {product.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Button className="h-9 px-4" onClick={() => startEdit(product)} type="button">
                          Editar
                        </Button>
                        <Button
                          className="h-9 bg-red-600 px-4 hover:bg-red-700"
                          onClick={() => handleDelete(product.id)}
                          type="button"
                        >
                          Desactivar
                        </Button>
                      </div>
                    </td>
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
