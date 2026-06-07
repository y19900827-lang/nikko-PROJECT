create extension if not exists pgcrypto;

create table if not exists public.product_code_sequences (
  year smallint primary key,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.generate_product_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code_year smallint := to_char(now(), 'YY')::smallint;
  next_number integer;
begin
  insert into public.product_code_sequences (year, last_number)
  values (code_year, 1)
  on conflict (year)
  do update set
    last_number = public.product_code_sequences.last_number + 1,
    updated_at = now()
  returning last_number into next_number;

  return 'BD' || lpad(code_year::text, 2, '0') || lpad(next_number::text, 4, '0');
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_code text unique not null,
  front_image_path text not null,
  tag_image_path text not null,
  registered_at timestamptz not null default now(),
  purchase_date date not null,
  purchase_price integer not null check (purchase_price >= 0),
  sale_price integer not null check (sale_price >= 0),
  category text not null check (category in ('ドレス', 'スカート', 'トップス', 'メンズシャツ', 'シューズ', 'アクセサリー', '小物', '一般服')),
  dance_style text not null check (dance_style in ('ラテン', 'スタンダード', '練習着', '一般服')),
  color text not null check (color in ('赤', '青', '黒', '白', 'ピンク', '紫', '緑', '黄', 'ゴールド', 'シルバー', 'ベージュ', '茶', 'グレー', 'ネイビー', '多色', '不明')),
  size text not null check (size in ('S', 'M', 'L', 'LL', '3L以上', '不明')),
  notes text not null default '',
  supplier text,
  storage_location text,
  sold_date date,
  status text not null default '在庫中' check (status in ('在庫中', '販売済', '値下げ', '保留')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

create index if not exists products_product_code_idx on public.products (product_code);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_dance_style_idx on public.products (dance_style);
create index if not exists products_color_idx on public.products (color);
create index if not exists products_size_idx on public.products (size);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_registered_at_idx on public.products (registered_at desc);
create index if not exists products_sale_price_idx on public.products (sale_price);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
