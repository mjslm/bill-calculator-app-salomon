-- schema.sql
-- Creates the calculations table with simplified structure and Row Level Security (RLS) policies
-- Table columns: id (bigserial), user_id (uuid), month (text), power_consumption (numeric), 
-- cost_per_kwh (numeric), result (numeric), created_at (timestamptz)

create extension if not exists "pgcrypto";

-- Drop existing table so this script can be re-run safely during development.
drop table if exists public.calculations cascade;

-- Create table with simplified structure matching your design
create table public.calculations (
  id bigserial primary key,
  user_id uuid not null,
  month text,
  power_consumption numeric,
  cost_per_kwh numeric,
  result numeric,
  created_at timestamptz default now()
);

-- Create index for efficient user queries
create index if not exists idx_calculations_user_created on public.calculations (user_id, created_at desc);

-- Enable Row Level Security
alter table public.calculations enable row level security;

-- Drop existing policies if present (safe to re-run)
drop policy if exists insert_own_calculations on public.calculations;
drop policy if exists select_own_calculations on public.calculations;
drop policy if exists delete_own_calculations on public.calculations;
drop policy if exists update_own_calculations on public.calculations;

-- INSERT: allow inserts only when user_id matches authenticated user
create policy insert_own_calculations on public.calculations
  for insert with check (auth.uid() = user_id);

-- SELECT: allow authenticated users to select only their own rows
create policy select_own_calculations on public.calculations
  for select using (auth.uid() = user_id);

-- DELETE: allow deleting only own rows
create policy delete_own_calculations on public.calculations
  for delete using (auth.uid() = user_id);

-- UPDATE: allow updating own rows and ensure new/updated row still belongs to the user
create policy update_own_calculations on public.calculations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- End of schema
