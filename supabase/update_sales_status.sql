alter table public.sales
  add column if not exists status text not null default 'pendiente_de_pago';

alter table public.sales
  drop constraint if exists sales_status_check;

alter table public.sales
  add constraint sales_status_check
  check (status in ('pendiente_de_pago', 'pendiente', 'pagado', 'por_despachar', 'despachado', 'entregado', 'cancelado'));

update public.sales
set status = 'entregado'
where status is null or status = '';

create or replace function public.create_sale(
  p_product_id uuid,
  p_quantity numeric,
  p_unit_price numeric,
  p_customer_id uuid default null,
  p_status text default 'pendiente_de_pago',
  p_customer text default null,
  p_channel text default null,
  p_created_at timestamptz default now()
)
returns public.sales
language plpgsql
as $$
declare
  v_product public.products%rowtype;
  v_category public.product_categories%rowtype;
  v_sale public.sales%rowtype;
  v_discount_percent numeric(5,2) := 0;
  v_effective_unit_price numeric(12,2);
  v_total numeric(12,2);
  v_cost numeric(12,2);
  v_profit numeric(12,2);
begin
  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  if not v_product.is_active then
    raise exception 'El producto está inactivo';
  end if;

  if p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  if p_status not in ('pendiente_de_pago', 'pendiente', 'pagado', 'por_despachar', 'despachado', 'entregado', 'cancelado') then
    raise exception 'Estado de venta inválido';
  end if;

  select * into v_category
  from public.product_categories
  where id = v_product.category_id;

  if v_product.current_stock < p_quantity then
    raise exception 'Stock insuficiente';
  end if;

  if v_category.bulk_discount_2_min_qty is not null and p_quantity >= v_category.bulk_discount_2_min_qty then
    v_discount_percent := coalesce(v_category.bulk_discount_2_percent, 0);
  elsif v_category.bulk_discount_1_min_qty is not null and p_quantity >= v_category.bulk_discount_1_min_qty then
    v_discount_percent := coalesce(v_category.bulk_discount_1_percent, 0);
  end if;

  v_effective_unit_price := round((p_unit_price * (1 - (v_discount_percent / 100)))::numeric, 2);
  v_total := round((p_quantity * v_effective_unit_price)::numeric, 2);
  v_cost := round((p_quantity * v_product.cost)::numeric, 2);
  v_profit := round((v_total - v_cost)::numeric, 2);

  update public.products
  set current_stock = current_stock - p_quantity
  where id = p_product_id;

  insert into public.sales (
    product_id,
    customer_id,
    status,
    quantity,
    unit_price,
    discount_percent,
    total,
    cost,
    profit,
    customer,
    channel,
    created_at
  )
  values (
    p_product_id,
    p_customer_id,
    p_status,
    p_quantity,
    v_effective_unit_price,
    v_discount_percent,
    v_total,
    v_cost,
    v_profit,
    p_customer,
    p_channel,
    p_created_at
  )
  returning * into v_sale;

  if p_customer_id is not null then
    update public.customers
    set total_spent = total_spent + v_total
    where id = p_customer_id;
  end if;

  return v_sale;
end;
$$;
