"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Productos" },
  { href: "/sales", label: "Ventas" },
  { href: "/orders", label: "Pedidos" },
  { href: "/customers", label: "Clientes" },
  { href: "/imports", label: "Importar CSV" },
  { href: "/movements", label: "Movimientos" },
  { href: "/expenses", label: "Gastos" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="w-full rounded-3xl bg-brand-900 p-6 text-white lg:w-72">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-200">Hars Ceramica</p>
            <h1 className="mt-3 text-3xl font-semibold">Gestion interna</h1>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-brand-900"
                      : "text-brand-100 hover:bg-brand-800 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
