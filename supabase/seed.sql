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
  sku,
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
  product_sku,
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
    ('Damasco', 'arc-dam'),
    ('Terracota', 'arc-ter'),
    ('Havai', 'arc-hav'),
    ('Egipto', 'arc-egi'),
    ('Ambar', 'arc-amb'),
    ('Fendi', 'arc-fen'),
    ('Flocos', 'arc-flo'),
    ('Sepia', 'arc-sep'),
    ('Lotus', 'arc-lot'),
    ('Everest', 'arc-eve'),
    ('Cappuccino', 'arc-cap'),
    ('Saara', 'arc-saa'),
    ('Marrocos', 'arc-mar'),
    ('Siberia', 'arc-sib'),
    ('Fénix', 'arc-fnx'),
    ('Vesuvio', 'arc-ves'),
    ('Londres', 'arc-lon')
) as seed_products(product_name, product_sku)
on conflict (name, category_id) do nothing;
