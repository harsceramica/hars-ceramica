export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getDiscountPercent({
  quantity,
  category,
}: {
  quantity: number;
  category?: {
    bulk_discount_1_min_qty?: number | null;
    bulk_discount_1_percent?: number | null;
    bulk_discount_2_min_qty?: number | null;
    bulk_discount_2_percent?: number | null;
  } | null;
}) {
  if (!category) {
    return 0;
  }

  if (
    category.bulk_discount_2_min_qty != null &&
    quantity >= category.bulk_discount_2_min_qty
  ) {
    return Number(category.bulk_discount_2_percent ?? 0);
  }

  if (
    category.bulk_discount_1_min_qty != null &&
    quantity >= category.bulk_discount_1_min_qty
  ) {
    return Number(category.bulk_discount_1_percent ?? 0);
  }

  return 0;
}

export function applyDiscount(unitPrice: number, discountPercent: number) {
  return Number((unitPrice * (1 - discountPercent / 100)).toFixed(2));
}
