-- Member management: optional self-reported demographics, suspensions, and an admin-only member list.
-- Run this once in the Supabase SQL editor (after 0001_init.sql).

-- ───────────── demographics (private: only the member can read their own row) ─────────────
-- Kept out of `profiles` on purpose: profiles are publicly readable.
create table public.member_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  country text check (country ~ '^[A-Z]{2}$'),                                  -- ISO 3166-1 alpha-2
  age_group text check (age_group in ('10s', '20s', '30s', '40s', '50s', '60plus')),
  gender text check (gender in ('female', 'male', 'other', 'undisclosed')),
  updated_at timestamptz not null default now()
);
alter table public.member_details enable row level security;

create policy "details select own" on public.member_details
  for select using (user_id = auth.uid());
create policy "details insert own" on public.member_details
  for insert with check (user_id = auth.uid());
create policy "details update own" on public.member_details
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "details delete own" on public.member_details
  for delete using (user_id = auth.uid());

-- ───────────── suspensions (a row = suspended; deleting the row restores the member) ─────────────
create table public.suspensions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  reason text check (char_length(reason) <= 200),
  suspended_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.suspensions enable row level security;

-- A member can see their own suspension (to show the notice). Only the service role writes.
create policy "suspension select own" on public.suspensions
  for select using (user_id = auth.uid());

create function public.is_suspended(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.suspensions where user_id = uid)
$$;

-- A suspended author's reviews are hidden from everyone except the author and admins.
drop policy "reviews readable" on public.reviews;
create policy "reviews readable" on public.reviews
  for select using (
    user_id = auth.uid() or public.is_admin() or not public.is_suspended(user_id)
  );

-- ...and a suspended member can't post new ones.
drop policy "review with verified receipt" on public.reviews;
create policy "review with verified receipt" on public.reviews
  for insert with check (
    user_id = auth.uid()
    and not public.is_suspended(auth.uid())
    and exists (
      select 1 from public.receipts r
      where r.id = receipt_id
        and r.user_id = auth.uid()
        and r.hospital_id = reviews.hospital_id
        and r.status in ('auto_approved', 'approved')
    )
  );

-- ───────────── admin member list ─────────────
-- Emails live in auth.users, so the list is a function that only the service role may call
-- (the app calls it after checking is_admin). Filters and paging happen in SQL.
create function public.admin_list_members(
  p_q text, p_country text, p_age text, p_gender text, p_status text,
  p_from date, p_to date, p_limit int, p_offset int
) returns table (
  id uuid, email text, display_name text, is_admin boolean, created_at timestamptz,
  country text, age_group text, gender text,
  suspended boolean, suspended_reason text,
  receipt_count int, review_count int, total_count bigint
)
language sql stable security definer set search_path = public, auth as $$
  with q as (
    select '%' || replace(replace(replace(coalesce(p_q, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select
    p.id, u.email::text, p.display_name, p.is_admin, p.created_at,
    d.country, d.age_group, d.gender,
    (s.user_id is not null), s.reason,
    (select count(*)::int from public.receipts r where r.user_id = p.id),
    (select count(*)::int from public.reviews v where v.user_id = p.id),
    count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.member_details d on d.user_id = p.id
  left join public.suspensions s on s.user_id = p.id
  cross join q
  where (coalesce(p_q, '') = '' or u.email ilike q.pattern or p.display_name ilike q.pattern)
    and (coalesce(p_country, '') = '' or (p_country = 'unset' and d.country is null) or d.country = p_country)
    and (coalesce(p_age, '') = '' or (p_age = 'unset' and d.age_group is null) or d.age_group = p_age)
    and (coalesce(p_gender, '') = '' or (p_gender = 'unset' and d.gender is null) or d.gender = p_gender)
    and (
      coalesce(p_status, '') in ('', 'all')
      or (p_status = 'active' and s.user_id is null)
      or (p_status = 'suspended' and s.user_id is not null)
      or (p_status = 'admin' and p.is_admin)
    )
    and (p_from is null or p.created_at >= p_from)
    and (p_to is null or p.created_at < p_to + 1)
  order by p.created_at desc, p.id
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;

revoke all on function public.admin_list_members(text, text, text, text, text, date, date, int, int) from public, anon, authenticated;
grant execute on function public.admin_list_members(text, text, text, text, text, date, date, int, int) to service_role;
