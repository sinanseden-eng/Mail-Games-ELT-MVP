-- Mail Games ELT 0.6: delivery diagnostics for protected two-inbox testing.

alter table public.match_turns
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed')),
  add column if not exists delivery_provider_id text null,
  add column if not exists delivery_error text null,
  add column if not exists delivery_recipient_masked text null,
  add column if not exists delivery_attempted_at timestamptz null;

create index if not exists match_turns_delivery_status_idx
  on public.match_turns(delivery_status);
