create or replace function public.juune_health_check()
returns jsonb
language sql
immutable
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object('status', 'ok');
$$;

grant execute on function public.juune_health_check() to anon, authenticated;
