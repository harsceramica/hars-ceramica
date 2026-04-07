alter table public.product_categories
  add column if not exists default_cost numeric(12,2) not null default 0 check (default_cost >= 0),
  add column if not exists default_price numeric(12,2) not null default 0 check (default_price >= 0),
  add column if not exists package_size numeric(12,2) check (package_size > 0),
  add column if not exists bulk_discount_1_min_qty numeric(12,2) check (bulk_discount_1_min_qty >= 0),
  add column if not exists bulk_discount_1_percent numeric(5,2) check (bulk_discount_1_percent >= 0 and bulk_discount_1_percent <= 100),
  add column if not exists bulk_discount_2_min_qty numeric(12,2) check (bulk_discount_2_min_qty >= 0),
  add column if not exists bulk_discount_2_percent numeric(5,2) check (bulk_discount_2_percent >= 0 and bulk_discount_2_percent <= 100);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  province text,
  phone text,
  payment_method text,
  purchase_channel text,
  products_of_interest text,
  total_spent numeric(12,2) not null default 0 check (total_spent >= 0),
  created_at timestamptz not null default now()
);

alter table public.sales
  add column if not exists status text not null default 'pendiente_de_pago',
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100);

alter table public.sales
  drop constraint if exists sales_status_check;

alter table public.sales
  add constraint sales_status_check
  check (status in ('pendiente_de_pago', 'pendiente', 'pagado', 'por_despachar', 'despachado', 'entregado', 'cancelado'));

create index if not exists idx_customers_name on public.customers(name);
create index if not exists idx_sales_customer on public.sales(customer_id);

update public.product_categories
set
  default_cost = 2800,
  default_price = 4400,
  package_size = 10,
  bulk_discount_1_min_qty = 200,
  bulk_discount_1_percent = 9,
  bulk_discount_2_min_qty = 400,
  bulk_discount_2_percent = 15
where name = 'Arcillas';

update public.products
set
  cost = 2800,
  price = 4400
where category_id in (
  select id
  from public.product_categories
  where name = 'Arcillas'
);

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

create or replace function public.delete_sale_and_restore_stock(
  p_sale_id uuid
)
returns void
language plpgsql
as $$
declare
  v_sale public.sales%rowtype;
begin
  select * into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  update public.products
  set current_stock = current_stock + v_sale.quantity
  where id = v_sale.product_id;

  delete from public.sales
  where id = p_sale_id;

  if v_sale.customer_id is not null then
    update public.customers
    set total_spent = greatest(total_spent - v_sale.total, 0)
    where id = v_sale.customer_id;
  end if;
end;
$$;
