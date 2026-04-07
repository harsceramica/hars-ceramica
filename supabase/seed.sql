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
