-- MediMate initial schema
create extension if not exists pgcrypto;

-- ───────────── profiles ─────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ───────────── hospitals ─────────────
-- Rows are upserted server-side (service role) from Naver search results.
create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,          -- hash of name + road address
  name text not null,
  category text,
  address text,
  road_address text,
  phone text,
  lat double precision,
  lng double precision,
  naver_link text,
  created_at timestamptz not null default now()
);

-- ───────────── receipts ─────────────
create type public.receipt_status as enum
  ('pending', 'auto_approved', 'approved', 'rejected');

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  storage_path text not null,
  file_hash text not null unique,            -- blocks re-using the same photo
  status public.receipt_status not null default 'pending',
  ocr_store_name text,
  ocr_paid_on date,
  ocr_total integer,
  match_score numeric(4, 3),
  ocr_raw jsonb,
  reject_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index receipts_user_idx on public.receipts (user_id, created_at desc);
create index receipts_status_idx on public.receipts (status, created_at);

-- ───────────── reviews ─────────────
create type public.english_level as enum ('none', 'basic', 'fluent');

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  receipt_id uuid not null unique references public.receipts (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 3000),
  visit_date date,
  treatment text check (char_length(treatment) <= 100),
  lang text not null check (lang in ('en', 'ja', 'zh', 'ko')),
  -- review categories
  english_support public.english_level not null default 'none',
  interpreter_available boolean not null default false,
  director_consultation boolean not null default false,  -- consulted by the head doctor
  price_explained boolean not null default false,        -- price told before treatment
  no_upselling boolean not null default false,           -- no pressure to add treatments
  created_at timestamptz not null default now()
);
create index reviews_hospital_idx on public.reviews (hospital_id, created_at desc);

-- ───────────── row level security ─────────────
alter table public.profiles enable row level security;
alter table public.hospitals enable row level security;
alter table public.receipts enable row level security;
alter table public.reviews enable row level security;

create policy "profiles readable" on public.profiles
  for select using (true);
create policy "profile self update" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));

create policy "hospitals readable" on public.hospitals
  for select using (true);

create policy "receipts own or admin" on public.receipts
  for select using (user_id = auth.uid() or public.is_admin());

create policy "reviews readable" on public.reviews
  for select using (true);

-- A review needs the author's own, verified receipt for the same hospital.
create policy "review with verified receipt" on public.reviews
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.receipts r
      where r.id = receipt_id
        and r.user_id = auth.uid()
        and r.hospital_id = reviews.hospital_id
        and r.status in ('auto_approved', 'approved')
    )
  );
create policy "review delete own" on public.reviews
  for delete using (user_id = auth.uid() or public.is_admin());

-- Receipts are written only by the server (service role): no insert/update policy.

-- ───────────── private storage for receipt photos ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;
-- No storage.objects policies: only the service role touches this bucket.

-- ───────────── aggregate view for hospital lists ─────────────
create view public.hospital_stats with (security_invoker = true) as
select
  h.id as hospital_id,
  count(r.id)::int as review_count,
  round(avg(r.rating), 1) as avg_rating,
  count(*) filter (where r.english_support = 'fluent')::int as fluent_english_count,
  count(*) filter (where r.director_consultation)::int as director_count
from public.hospitals h
left join public.reviews r on r.hospital_id = h.id
group by h.id;
