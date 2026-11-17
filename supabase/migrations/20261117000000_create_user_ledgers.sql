create table if not exists public.user_ledgers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_ledgers_data_object check (jsonb_typeof(data) = 'object')
);

alter table public.user_ledgers enable row level security;
alter table public.user_ledgers force row level security;

create policy "Users can read their own ledger"
  on public.user_ledgers for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own ledger"
  on public.user_ledgers for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own ledger"
  on public.user_ledgers for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own ledger"
  on public.user_ledgers for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.user_ledgers from anon;
grant select, insert, update, delete on public.user_ledgers to authenticated;
