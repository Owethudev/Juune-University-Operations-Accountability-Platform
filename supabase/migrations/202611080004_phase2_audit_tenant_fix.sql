create or replace function juune_private.audit_security_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  changed_row jsonb;
  target_identifier text;
  change_action text;
  row_institution_id uuid;
begin
  changed_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_identifier := coalesce(
    changed_row ->> 'id',
    concat_ws(':', changed_row ->> 'user_id', changed_row ->> 'role_code',
      changed_row ->> 'permission_code', changed_row ->> 'request_id'),
    'unknown'
  );
  row_institution_id := case
    when tg_table_name = 'institutions' then nullif(changed_row ->> 'id', '')::uuid
    else nullif(changed_row ->> 'institution_id', '')::uuid
  end;
  change_action := 'authorization.' || lower(tg_op);

  insert into public.audit_events (
    institution_id, actor_user_id, action, target_type, target_id, outcome
  ) values (
    row_institution_id,
    juune_private.current_user_id(),
    change_action,
    tg_table_name,
    target_identifier,
    'success'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
