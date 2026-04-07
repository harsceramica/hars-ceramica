create extension if not exists pgcrypto;

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_cost numeric(12,2) not null default 0 check (default_cost >= 0),
  default_price numeric(12,2) not null default 0 check (default_price >= 0),
  package_size numeric(12,2) check (package_size > 0),
  bulk_discount_1_min_qty numeric(12,2) check (bulk_discount_1_min_qty >= 0),
  bulk_discount_1_percent numeric(5,2) check (bulk_discount_1_percent >= 0 and bulk_discount_1_percent <= 100),
  bulk_discount_2_min_qty numeric(12,2) check (bulk_discount_2_min_qty >= 0),
  bulk_discount_2_percent numeric(5,2) check (bulk_discount_2_percent >= 0 and bulk_discount_2_percent <= 100)
);

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

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references public.product_categories(id) on delete restrict,
  unit text not null default 'kg',
  current_stock numeric(12,2) not null default 0 check (current_stock >= 0),
  min_stock numeric(12,2) not null default 0 check (min_stock >= 0),
  cost numeric(12,2) not null default 0 check (cost >= 0),
  price numeric(12,2) not null default 0 check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint products_name_category_unique unique (name, category_id)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'pendiente_de_pago' check (status in ('pendiente_de_pago', 'pendiente', 'pagado', 'por_despachar', 'despachado', 'entregado', 'cancelado')),
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  total numeric(12,2) not null check (total >= 0),
  cost numeric(12,2) not null check (cost >= 0),
  profit numeric(12,2) not null,
  customer text,
  channel text,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  type text not null check (type in ('entrada', 'salida', 'ajuste')),
  quantity numeric(12,2) not null check (quantity > 0),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(is_active);
create index if not exists idx_customers_name on public.customers(name);
create index if not exists idx_sales_product on public.sales(product_id);
create index if not exists idx_sales_customer on public.sales(customer_id);
create index if not exists idx_sales_created_at on public.sales(created_at desc);
create index if not exists idx_stock_movements_product on public.stock_movements(product_id);
create index if not exists idx_stock_movements_created_at on public.stock_movements(created_at desc);
create index if not exists idx_expenses_created_at on public.expenses(created_at desc);

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

create or replace function public.create_stock_movement(
  p_product_id uuid,
  p_type text,
  p_quantity numeric,
  p_note text default null,
  p_created_at timestamptz default now()
)
returns public.stock_movements
language plpgsql
as $$
declare
  v_product public.products%rowtype;
  v_movement public.stock_movements%rowtype;
  v_new_stock numeric(12,2);
begin
  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  if p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  if p_type = 'entrada' then
    v_new_stock := v_product.current_stock + p_quantity;
  elsif p_type = 'salida' then
    v_new_stock := v_product.current_stock - p_quantity;
  elsif p_type = 'ajuste' then
    v_new_stock := p_quantity;
  else
    raise exception 'Tipo de movimiento inválido';
  end if;

  if v_new_stock < 0 then
    raise exception 'El stock no puede quedar negativo';
  end if;

  update public.products
  set current_stock = v_new_stock
  where id = p_product_id;

  insert into public.stock_movements (
    product_id,
    type,
    quantity,
    note,
    created_at
  )
  values (
    p_product_id,
    p_type,
    p_quantity,
    p_note,
    p_created_at
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

insert into public.product_categories (
  name,
  default_cost,
  default_price,
  package_size,
  bulk_discount_1_min_qty,
  bulk_discount_1_percent,
  bulk_discount_2_min_qty,
  bulk_discount_2_percent
)
values ('Arcillas', 2800, 4400, 10, 200, 9, 400, 15)
on conflict (name) do nothing;

with arcillas as (
  select * from public.product_categories where name = 'Arcillas'
)
insert into public.products (
  name,
  category_id,
  unit,
  current_stock,
  min_stock,
  cost,
  price,
  is_active
)
select
  product_name,
  arcillas.id,
  'kg',
  0,
  0,
  arcillas.default_cost,
  arcillas.default_price,
  true
from arcillas
cross join (
  values
    ('Damasco'),
    ('Terracota'),
    ('Havai'),
    ('Egipto'),
    ('Ambar'),
    ('Fendi'),
    ('Flocos'),
    ('Sepia'),
    ('Lotus'),
    ('Everest'),
    ('Cappuccino'),
    ('Saara'),
    ('Marrocos'),
    ('Siberia'),
    ('Fénix'),
    ('Vesuvio'),
    ('Londres')
) as seed_products(product_name)
on conflict (name, category_id) do nothing;
