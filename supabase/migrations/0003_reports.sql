-- Review reports: members flag a review, administrators decide. Run once after 0002_members.sql.

-- ───────────── hiding a review (reversible) ─────────────
-- Only a timestamp, no foreign key to profiles: reviews already has one (user_id), and a second would
-- make the `profiles(...)` embeds used across the app ambiguous.
alter table public.reviews add column hidden_at timestamptz;

-- Hidden reviews stay visible to their author and to administrators.
drop policy "reviews readable" on public.reviews;
create policy "reviews readable" on public.reviews
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or (hidden_at is null and not public.is_suspended(user_id))
  );

-- ───────────── reports ─────────────
create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('spam', 'abuse', 'personal_info', 'false_info', 'other')),
  detail text check (char_length(detail) <= 300),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)              -- one report per member per review
);
create index review_reports_queue_idx on public.review_reports (status, created_at);
create index review_reports_review_idx on public.review_reports (review_id);

alter table public.review_reports enable row level security;

-- A member sees only their own reports (to know they already reported); administrators see all.
create policy "reports select own or admin" on public.review_reports
  for select using (reporter_id = auth.uid() or public.is_admin());

-- A member files an open report on someone else's review that they can see. Decisions are made by
-- the server with the service role (no update/delete policy).
create policy "reports insert own" on public.review_reports
  for insert with check (
    reporter_id = auth.uid()
    and status = 'open'
    and resolved_by is null
    and resolved_at is null
    and not public.is_suspended(auth.uid())
    and exists (
      select 1 from public.reviews r
      where r.id = review_id and r.user_id <> auth.uid()
    )
  );
