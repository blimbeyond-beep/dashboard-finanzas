-- Dashboard Financiero Privado (Supabase)
-- Ejecuta este script en: Supabase → SQL Editor

-- Recomendado para gen_random_uuid()
create extension if not exists "pgcrypto";

-- =========================
-- 1) PERFIL
-- =========================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  birthdate date,
  initial_capital numeric(14,2) not null default 0,
  currency text not null default 'MXN',
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

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- (Opcional) si quieres permitir borrar tu propio perfil:
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
using (auth.uid() = user_id);


-- =========================
-- 2) TRANSACCIONES
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type public.transaction_type as enum ('income', 'expense');
  end if;
end $$;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(14,2) not null check (amount > 0),
  category text,
  note text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_id_date_idx
on public.transactions (user_id, date desc, created_at desc);

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
on public.transactions
for select
using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
on public.transactions
for insert
with check (auth.uid() = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
on public.transactions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
on public.transactions
for delete
using (auth.uid() = user_id);


-- =========================
-- 3) HARDENING (Opcional)
-- =========================
-- Si usas el rol "anon" desde el frontend, debes mantener RLS activado.
-- Puedes revocar privilegios extra si has hecho grants manuales.
-- Por defecto, Supabase maneja grants razonables, así que esto es opcional.

