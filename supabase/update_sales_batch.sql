drop function if exists public.create_sale(uuid, numeric, numeric, uuid, text, text, timestamptz);

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
