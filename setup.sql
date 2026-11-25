-- ============================================================
--  SUNRISE 1ST ANNIVERSARY — Supabase setup
--  Run once in your EXISTING PYS Open Supabase project:
--  SQL Editor → New query → paste → Run.
--  It adds a separate table (sunrise_kv) and reuses the same
--  official list as PYS Open (public.pys_is_official()), so the
--  same Match Control logins can enter scores. PYS data is untouched.
-- ============================================================

create table if not exists public.sunrise_kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.sunrise_kv enable row level security;

-- Newer Supabase projects don't auto-grant table privileges.
grant usage on schema public to anon, authenticated;
grant select on public.sunrise_kv to anon, authenticated;
grant insert, update, delete on public.sunrise_kv to authenticated;

-- Everyone can READ; only PYS/Sunrise officials can WRITE.
drop policy if exists "public read" on public.sunrise_kv;
create policy "public read" on public.sunrise_kv for select using (true);
drop policy if exists "officials insert" on public.sunrise_kv;
drop policy if exists "officials update" on public.sunrise_kv;
drop policy if exists "officials delete" on public.sunrise_kv;
create policy "officials insert" on public.sunrise_kv for insert with check (public.pys_is_official());
create policy "officials update" on public.sunrise_kv for update using (public.pys_is_official()) with check (public.pys_is_official());
create policy "officials delete" on public.sunrise_kv for delete using (public.pys_is_official());

-- Realtime, so phones and the TV update instantly.
do $$ begin
  alter publication supabase_realtime add table public.sunrise_kv;
exception when duplicate_object then null; end $$;

-- Audit log of every change (reuses the PYS log table).
create or replace function public.sunrise_log_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.pys_log(who, key, old_value, new_value)
  values (auth.jwt() ->> 'email', 'sunrise:' || coalesce(new.key, old.key),
          case when tg_op <> 'INSERT' then old.value end,
          case when tg_op <> 'DELETE' then new.value end);
  return coalesce(new, old);
end $$;

drop trigger if exists sunrise_kv_log on public.sunrise_kv;
create trigger sunrise_kv_log after insert or update or delete on public.sunrise_kv
  for each row execute function public.sunrise_log_change();
