# Tiny Ledger

A private photography-business finance app built with Vite, React, TypeScript, Supabase Auth, and Supabase PostgreSQL. Each account's ledger is synced to its own RLS-protected database row. New accounts start with an empty ledger and Papua New Guinean kina (PGK).

## Get started

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set your project URL and **publishable** (or legacy `anon`) key. Never put a service-role key in the frontend.
3. Run both SQL migrations in the Supabase SQL Editor (or apply them with the Supabase CLI):
   - [`supabase/migrations/20261117000000_create_user_ledgers.sql`](./supabase/migrations/20261117000000_create_user_ledgers.sql) creates the private per-user ledger.
   - [`supabase/migrations/20261117230000_create_private_avatars_bucket.sql`](./supabase/migrations/20261117230000_create_private_avatars_bucket.sql) creates the private profile-photo bucket and its user-scoped storage policies.
4. In Supabase Auth settings, enable the email provider, configure your site URL, and allow the deployed site's root URL and `/reset-password` redirect. Configure a custom SMTP provider before inviting real users so confirmation and recovery emails are deliverable.
5. Install and start the app:

   ```sh
   npm install
   npm run dev
   ```

The app remains closed to account data until its Supabase credentials are configured. Supabase email confirmation follows the project's Auth settings.

New users begin with zero income, expenses, savings, and spending limits. PGK is the default display and storage currency for new ledgers. Each account can select another supported currency; amounts are converted using the latest rates from ExchangeRate-API, refreshed on sign-in and every 12 hours. Rate requests contain no account or financial data. Existing version 1 ledgers are preserved with their values treated as USD-denominated and displayed in PGK.

## Build and deploy

```sh
npm run build
npm run preview
```

Connect the repository to Netlify and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables. The included `netlify.toml` builds and publishes `dist`, and rewrites SPA routes such as `/reset-password`.

## Account security and backups

Supabase Auth handles account credentials and recovery. The database migration enables and forces RLS on `public.user_ledgers`; authenticated users can select, insert, update, and delete only the row whose `user_id` equals `auth.uid()`. The private `avatars` bucket also has row-level storage policies restricting file access to the owning user. The frontend uses only the public publishable key and scopes every ledger operation to the signed-in user. Do not disable RLS or add a service-role secret to frontend configuration.

Use **Settings → Export JSON** for a per-account backup or **Restore a backup** to import one into that account. Resetting clears that account's ledger. Financial data is stored in Supabase; the browser's local storage is used only by Supabase Auth for its session.
