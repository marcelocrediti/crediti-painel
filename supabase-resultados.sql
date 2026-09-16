-- Eventos anônimos e não sensíveis do App Crediti.
-- O aplicativo pode apenas inserir. Somente usuários autenticados do painel podem ler.

create table if not exists public.crediti_app_events (
  id bigint generated always as identity primary key,
  event_name text not null check (
    event_name in (
      'app_open',
      'search',
      'product_view',
      'service_click',
      'partner_click',
      'whatsapp_click',
      'ai_chat_started',
      'lead_created'
    )
  ),
  visitor_id uuid not null,
  session_id uuid not null,
  page_path text not null default '/',
  product text,
  search_term text,
  destination text,
  traffic_source text not null default 'direto',
  utm_medium text,
  utm_campaign text,
  event_time timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint crediti_app_events_page_path_size check (char_length(page_path) <= 180),
  constraint crediti_app_events_product_size check (product is null or char_length(product) <= 160),
  constraint crediti_app_events_search_size check (search_term is null or char_length(search_term) <= 120),
  constraint crediti_app_events_destination_size check (destination is null or char_length(destination) <= 160),
  constraint crediti_app_events_source_size check (char_length(traffic_source) <= 80),
  constraint crediti_app_events_medium_size check (utm_medium is null or char_length(utm_medium) <= 80),
  constraint crediti_app_events_campaign_size check (utm_campaign is null or char_length(utm_campaign) <= 160)
);

create index if not exists crediti_app_events_time_idx
  on public.crediti_app_events (event_time desc);

create index if not exists crediti_app_events_name_time_idx
  on public.crediti_app_events (event_name, event_time desc);

create index if not exists crediti_app_events_visitor_time_idx
  on public.crediti_app_events (visitor_id, event_time desc);

alter table public.crediti_app_events enable row level security;

revoke all on table public.crediti_app_events from anon, authenticated;
grant insert on table public.crediti_app_events to anon;
grant insert, select on table public.crediti_app_events to authenticated;
grant usage, select on sequence public.crediti_app_events_id_seq to anon, authenticated;

drop policy if exists "App Crediti registra eventos" on public.crediti_app_events;
create policy "App Crediti registra eventos"
  on public.crediti_app_events
  for insert
  to anon
  with check (
    event_time >= now() - interval '10 minutes'
    and event_time <= now() + interval '2 minutes'
  );

drop policy if exists "Painel registra eventos" on public.crediti_app_events;
create policy "Painel registra eventos"
  on public.crediti_app_events
  for insert
  to authenticated
  with check (true);

drop policy if exists "Painel lê eventos" on public.crediti_app_events;
create policy "Painel lê eventos"
  on public.crediti_app_events
  for select
  to authenticated
  using (true);
