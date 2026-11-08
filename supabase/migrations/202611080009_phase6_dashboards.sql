create or replace function public.request_dashboard_summary_filtered(
  required_from_date date default null,
  required_to_date date default null,
  required_status public.request_status default null,
  required_department_id uuid default null
)
returns table (
  department_id uuid,
  department_name text,
  status public.request_status,
  request_count bigint,
  assigned_count bigint
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    r.department_id,
    d.name,
    r.status,
    count(*)::bigint,
    count(*) filter (where r.assigned_to_user_id is not null)::bigint
  from public.requests r
  join public.departments d
    on d.institution_id = r.institution_id
    and d.id = r.department_id
  where r.institution_id = juune_private.current_institution_id()
    and r.sensitivity = 'standard'
    and juune_private.is_active_principal()
    and juune_private.has_permission('SEC6')
    and (
      (
        juune_private.has_role('department_manager')
        and juune_private.is_manager_of(r.department_id)
      )
      or juune_private.has_role('senior_leadership')
    )
    and (
      required_from_date is null
      or r.created_at >= (required_from_date::timestamp at time zone 'UTC')
    )
    and (
      required_to_date is null
      or r.created_at < ((required_to_date + 1)::timestamp at time zone 'UTC')
    )
    and (required_status is null or r.status = required_status)
    and (
      required_department_id is null
      or r.department_id = required_department_id
    )
  group by r.department_id, d.name, r.status
$$;

revoke all on function public.request_dashboard_summary_filtered(
  date, date, public.request_status, uuid
) from public, anon, authenticated;
grant execute on function public.request_dashboard_summary_filtered(
  date, date, public.request_status, uuid
) to authenticated;
