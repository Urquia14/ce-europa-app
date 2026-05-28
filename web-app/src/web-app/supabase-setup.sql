-- ============================================================
--  CE Europa — esquema de Supabase
--  Enganxa tot aquest contingut a:  Supabase -> SQL Editor -> New query -> Run
-- ============================================================

-- Taula on es desa l'estat complet de l'app per a cada usuari (un sol registre per usuari)
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Seguretat a nivell de fila: cada usuari només pot veure/editar el SEU registre
alter table public.user_state enable row level security;

drop policy if exists "user_state_select_own" on public.user_state;
create policy "user_state_select_own"
  on public.user_state for select
  using (auth.uid() = user_id);

drop policy if exists "user_state_insert_own" on public.user_state;
create policy "user_state_insert_own"
  on public.user_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_state_update_own" on public.user_state;
create policy "user_state_update_own"
  on public.user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- (Opcional) permetre esborrar el propi registre
drop policy if exists "user_state_delete_own" on public.user_state;
create policy "user_state_delete_own"
  on public.user_state for delete
  using (auth.uid() = user_id);
