alter table public.customers
  add column if not exists transport text;

alter table public.products
  add column if not exists sku text;

create unique index if not exists idx_products_sku_unique
on public.products(sku)
where sku is not null;

alter table public.sales
  add column if not exists import_source text,
  add column if not exists external_reference text,
  add column if not exists external_line_reference text;

create unique index if not exists idx_sales_external_line_reference_unique
on public.sales(external_line_reference)
where external_line_reference is not null;

create index if not exists idx_sales_external_reference on public.sales(external_reference);

update public.products set sku = 'arc-dam' where name = 'Damasco' and sku is null;
update public.products set sku = 'arc-ter' where name = 'Terracota' and sku is null;
update public.products set sku = 'arc-hav' where name = 'Havai' and sku is null;
update public.products set sku = 'arc-egi' where name = 'Egipto' and sku is null;
update public.products set sku = 'arc-amb' where name = 'Ambar' and sku is null;
update public.products set sku = 'arc-fen' where name = 'Fendi' and sku is null;
update public.products set sku = 'arc-flo' where name = 'Flocos' and sku is null;
update public.products set sku = 'arc-sep' where name = 'Sepia' and sku is null;
update public.products set sku = 'arc-lot' where name = 'Lotus' and sku is null;
update public.products set sku = 'arc-eve' where name = 'Everest' and sku is null;
update public.products set sku = 'arc-cap' where name = 'Cappuccino' and sku is null;
update public.products set sku = 'arc-saa' where name = 'Saara' and sku is null;
update public.products set sku = 'arc-mar' where name = 'Marrocos' and sku is null;
update public.products set sku = 'arc-sib' where name = 'Siberia' and sku is null;
update public.products set sku = 'arc-fnx' where name = 'Fénix' and sku is null;
update public.products set sku = 'arc-ves' where name = 'Vesuvio' and sku is null;
update public.products set sku = 'arc-lon' where name = 'Londres' and sku is null;

create or replace function public.create_sale(
  p_product_id uuid,
  p_quantity numeric,
  p_unit_price numeric,
  p_customer_id uuid default null,
  p_status text default 'pendiente_de_pago',
  p_import_source text default null,
  p_external_reference text default null,
  p_external_line_reference text default null,
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
  if p_external_line_reference is not null then
    select * into v_sale
    from public.sales
    where external_line_reference = p_external_line_reference;

    if found then
      return v_sale;
    end if;
  end if;

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
    import_source,
    external_reference,
    external_line_reference,
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
    p_import_source,
    p_external_reference,
    p_external_line_reference,
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

create or replace function public.create_sale_batch(
  p_customer_id uuid default null,
  p_status text default 'pendiente_de_pago',
  p_customer text default null,
  p_channel text default null,
  p_created_at timestamptz default now(),
  p_items jsonb default '[]'::jsonb
)
returns setof public.sales
language plpgsql
as $$
declare
  v_item jsonb;
  v_sale public.sales%rowtype;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe incluir al menos un producto';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    select *
    into v_sale
    from public.create_sale(
      p_product_id => (v_item->>'product_id')::uuid,
      p_quantity => (v_item->>'quantity')::numeric,
      p_unit_price => (v_item->>'unit_price')::numeric,
      p_customer_id => p_customer_id,
      p_status => p_status,
      p_import_source => null,
      p_external_reference => null,
      p_external_line_reference => null,
      p_customer => p_customer,
      p_channel => p_channel,
      p_created_at => p_created_at
    );

    return next v_sale;
  end loop;

  return;
end;
$$;
