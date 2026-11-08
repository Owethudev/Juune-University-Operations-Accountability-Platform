alter table public.requests
  add column if not exists idempotency_key uuid;

update public.requests
set idempotency_key = gen_random_uuid()
where idempotency_key is null;

alter table public.requests
  alter column idempotency_key set default gen_random_uuid(),
  alter column idempotency_key set not null;

create unique index if not exists requests_submission_idempotency_uidx
  on public.requests (institution_id, requester_id, idempotency_key);

create or replace function juune_private.record_initial_request_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.request_events (
    institution_id,
    request_id,
    actor_user_id,
    actor_type,
    event_type,
    metadata
  ) values (
    new.institution_id,
    new.id,
    new.requester_id,
    'user',
    'created',
    jsonb_build_object('reference', new.reference)
  );
  return new;
end;
$$;

revoke all on function juune_private.record_initial_request_event()
  from public, anon, authenticated;

drop trigger if exists requests_record_initial_event on public.requests;
create trigger requests_record_initial_event
  after insert on public.requests
  for each row execute function juune_private.record_initial_request_event();
