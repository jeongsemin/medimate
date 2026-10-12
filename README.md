# MediMate

Receipt-verified reviews of Korean hospitals and dermatology clinics, for travelers.
Languages: English, 日本語, 中文, 한국어.

Flow: Google sign-in → search a clinic (Naver Local Search) → upload receipt → OCR check
(auto-approve, else manual queue) → write a review.

## Stack
Next.js 16 (App Router, `proxy.ts`), Supabase (Auth, Postgres + RLS, private Storage),
Naver Local Search API, Naver CLOVA OCR (receipt), Tailwind CSS 4.

## Setup
1. `npm install`
2. Create a Supabase project, run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Supabase → Authentication → Providers → enable **Google**; add
   `http://localhost:3000/auth/callback` to the redirect URLs.
4. Copy `.env.example` to `.env.local` and fill it in.
5. `npm run dev`
6. Make yourself admin: `update public.profiles set is_admin = true where id = '<your user id>';`

## How receipts are verified
`POST /api/receipts` stores the photo in a private bucket, runs CLOVA OCR and compares
clinic name (bigram similarity ≥ 0.6), date (≤ 90 days, not future) and total amount.
All checks pass → `auto_approved`; otherwise → `pending` for `/admin`. Photos are
de-duplicated by SHA-256 and one receipt can back only one review. The database (RLS)
refuses a review unless it points to the author's own approved receipt for that clinic.

## Scripts
`npm test` (unit tests) · `npm run lint` · `npm run build`
