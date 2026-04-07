"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createCustomer, getCustomers } from "@/lib/services/customers";
import { getProducts } from "@/lib/services/products";
import { createSale, deleteSale, getSales } from "@/lib/services/sales";
import { applyDiscount, formatCurrency, formatDate, getDiscountPercent } from "@/lib/utils";
import type {
  CustomerFormValues,
  CustomerWithStats,
  ProductWithCategory,
  SaleStatus,
  SaleFormValues,
  SaleWithProduct,
} from "@/types";

const initialSaleForm: SaleFormValues = {
  product_id: "",
  customer_id: "",
  status: "pendiente_de_pago",
  quantity: 0,
  unit_price: 0,
  customer: "",
  channel: "",
};

const initialCustomerForm: CustomerFormValues = {
  name: "",
  address: "",
  province: "",
  phone: "",
  payment_method: "",
  purchase_channel: "",
  products_of_interest: "",
};

const STATUS_OPTIONS: Array<{ value: SaleStatus; label: string }> = [
  { value: "pendiente_de_pago", label: "Pendiente de pago" },
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
  { value: "por_despachar", label: "Por despachar" },
  { value: "despachado", label: "Despachado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

export function SalesView() {
  const [sales, setSales] = useState<SaleWithProduct[]>([]);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [form, setForm] = useState<SaleFormValues>(initialSaleForm);
  const [customerForm, setCustomerForm] = useState<CustomerFormValues>(initialCustomerForm);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setError("");
      const [salesResponse, productsResponse, customersResponse] = await Promise.all([
        getSales(),
        getProducts(),
        getCustomers(),
      ]);

      setSales(salesResponse);
      setProducts(productsResponse);
      setCustomers(customersResponse);
      setForm((current) => ({
        ...current,
        product_id: current.product_id || productsResponse[0]?.id || "",
        unit_price: current.unit_price || Number(productsResponse[0]?.price ?? 0),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las ventas.");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.product_id),
    [products, form.product_id],
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customer_id),
    [customers, form.customer_id],
  );

  const discountPercent = getDiscountPercent({
    quantity: Number(form.quantity),
    category: selectedProduct?.category,
  });

  const finalUnitPrice = applyDiscount(Number(form.unit_price), discountPercent);
  const total = Number((Number(form.quantity || 0) * finalUnitPrice).toFixed(2));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await createSale({
        ...form,
        customer_id: form.customer_id || undefined,
        customer: selectedCustomer?.name || form.customer || undefined,
        channel: form.channel || selectedCustomer?.purchase_channel || undefined,
      });

      await loadData();
      setForm({
        ...initialSaleForm,
        product_id: products[0]?.id ?? "",
        unit_price: Number(products[0]?.price ?? 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la venta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingCustomer(true);
      setError("");
      const newCustomer = await createCustomer(customerForm);
      await loadData();
      setForm((current) => ({
        ...current,
        customer_id: newCustomer.id,
        customer: newCustomer.name,
        channel: current.channel || newCustomer.purchase_channel || "",
      }));
      setCustomerForm(initialCustomerForm);
      setShowCustomerForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el cliente.");
    } finally {
      setSavingCustomer(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setError("");
      await deleteSale(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la venta.");
    }
  }

  function handleProductChange(productId: string) {
    const product = products.find((item) => item.id === productId);

    setForm((current) => ({
      ...current,
      product_id: productId,
      unit_price: Number(product?.price ?? 0),
    }));
  }

  function handleCustomerChange(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);

    setForm((current) => ({
      ...current,
      customer_id: customerId,
      customer: customer?.name ?? "",
      channel: current.channel || customer?.purchase_channel || "",
    }));
  }

  return (
    <section>
      <PageHeader
        title="Ventas"
        description="Ventas con cliente opcional, CRM basico y descuento automatico por cantidad segun la categoria."
      />

      {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[420px,1fr]">
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-stone-900">Registrar venta</h3>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label>Producto</Label>
                <Select
                  required
                  value={form.product_id}
                  onChange={(event) => handleProductChange(event.target.value)}
                >
                  <option value="">Seleccionar</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - Stock {Number(product.current_stock)} {product.unit}
                    </option>
                  ))}
                </Select>
                {selectedProduct?.category?.package_size ? (
                  <p className="mt-2 text-xs text-stone-500">
                    Se trabaja en {selectedProduct.unit}. Referencia de paquete: {Number(selectedProduct.category.package_size)} {selectedProduct.unit}.
                  </p>
                ) : null}
              </div>

              <div>
                <Label>Cliente</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.customer_id}
                    onChange={(event) => handleCustomerChange(event.target.value)}
                  >
                    <option value="">Sin cliente asociado</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    className="shrink-0 px-4"
                    onClick={() => setShowCustomerForm((current) => !current)}
                    type="button"
                  >
                    {showCustomerForm ? "Cerrar" : "Nuevo"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cantidad en kg</Label>
                  <Input
                    required
                    min={0.01}
                    step="0.01"
                    type="number"
                    value={form.quantity}
                    onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })}
                  />
                </div>

                <div>
                  <Label>Precio base por kg</Label>
                  <Input
                    required
                    min={0}
                    step="0.01"
                    type="number"
                    value={form.unit_price}
                    onChange={(event) =>
                      setForm({ ...form, unit_price: Number(event.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
                <div className="flex items-center justify-between">
                  <span>Descuento aplicado</span>
                  <strong>{discountPercent}%</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Precio final por kg</span>
                  <strong>{formatCurrency(finalUnitPrice)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total estimado</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
                <p className="text-xs text-stone-500">
                  Desde 200 kg aplica 9% off. Desde 400 kg aplica 15% off.
                </p>
              </div>

              <div>
                <Label>Estado del pedido</Label>
                <Select
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value as SaleStatus })
                  }
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Canal de compra</Label>
                <Select
                  value={form.channel}
                  onChange={(event) => setForm({ ...form, channel: event.target.value })}
                >
                  <option value="">Seleccionar</option>
                  <option value="Tiendanube">Tiendanube</option>
                  <option value="Instagram">Instagram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Mostrador">Mostrador</option>
                </Select>
              </div>

              <Button disabled={saving} type="submit">
                {saving ? "Guardando..." : "Crear venta"}
              </Button>
            </form>
          </Card>

          {showCustomerForm ? (
            <Card>
              <h3 className="text-lg font-semibold text-stone-900">Nuevo cliente</h3>

              <form className="mt-5 space-y-4" onSubmit={handleCreateCustomer}>
                <div>
                  <Label>Nombre</Label>
                  <Input
                    required
                    value={customerForm.name}
                    onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })}
                  />
                </div>

                <div>
                  <Label>Direccion</Label>
                  <Input
                    value={customerForm.address}
                    onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Provincia</Label>
                    <Input
                      value={customerForm.province}
                      onChange={(event) => setCustomerForm({ ...customerForm, province: event.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Telefono</Label>
                    <Input
                      value={customerForm.phone}
                      onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Medio de pago</Label>
                    <Input
                      value={customerForm.payment_method}
                      onChange={(event) =>
                        setCustomerForm({ ...customerForm, payment_method: event.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Canal</Label>
                    <Select
                      value={customerForm.purchase_channel}
                      onChange={(event) =>
                        setCustomerForm({ ...customerForm, purchase_channel: event.target.value })
                      }
                    >
                      <option value="">Seleccionar</option>
                      <option value="Tiendanube">Tiendanube</option>
                      <option value="Instagram">Instagram</option>
                      <option value="WhatsApp">WhatsApp</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Que compro / interes</Label>
                  <Textarea
                    value={customerForm.products_of_interest}
                    onChange={(event) =>
                      setCustomerForm({ ...customerForm, products_of_interest: event.target.value })
                    }
                  />
                </div>

                <Button disabled={savingCustomer} type="submit">
                  {savingCustomer ? "Guardando..." : "Crear cliente"}
                </Button>
              </form>
            </Card>
          ) : null}
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-5 py-4 font-medium">Fecha</th>
                  <th className="px-5 py-4 font-medium">Cliente</th>
                  <th className="px-5 py-4 font-medium">Producto</th>
                  <th className="px-5 py-4 font-medium">Cantidad</th>
                  <th className="px-5 py-4 font-medium">Desc.</th>
                  <th className="px-5 py-4 font-medium">Estado</th>
                  <th className="px-5 py-4 font-medium">Precio/kg</th>
                  <th className="px-5 py-4 font-medium">Total</th>
                  <th className="px-5 py-4 font-medium">Canal</th>
                  <th className="px-5 py-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-t border-stone-100">
                    <td className="px-5 py-4 text-stone-600">{formatDate(sale.created_at)}</td>
                    <td className="px-5 py-4 text-stone-600">
                      {sale.client?.name || sale.customer || "-"}
                    </td>
                    <td className="px-5 py-4 font-medium text-stone-900">{sale.product?.name}</td>
                    <td className="px-5 py-4 text-stone-600">
                      {Number(sale.quantity)} {sale.product?.unit}
                    </td>
                    <td className="px-5 py-4 text-stone-600">{Number(sale.discount_percent)}%</td>
                    <td className="px-5 py-4 text-stone-600">
                      {STATUS_OPTIONS.find((option) => option.value === sale.status)?.label ?? sale.status}
                    </td>
                    <td className="px-5 py-4 text-stone-600">{formatCurrency(Number(sale.unit_price))}</td>
                    <td className="px-5 py-4 text-stone-600">{formatCurrency(Number(sale.total))}</td>
                    <td className="px-5 py-4 text-stone-600">{sale.channel || "-"}</td>
                    <td className="px-5 py-4">
                      <Button
                        className="h-9 bg-red-600 px-4 hover:bg-red-700"
                        onClick={() => handleDelete(sale.id)}
                        type="button"
                      >
                        Eliminar
                      </Button>
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
