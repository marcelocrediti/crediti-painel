create extension if not exists pgcrypto;

create table if not exists public.arquivo_clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text not null unique check (cpf ~ '^[0-9]{11}$'),
  telefone text,
  cidade text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arquivo_contratos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.arquivo_clientes(id) on delete cascade,
  tipo text not null,
  subtipo text,
  numero_contrato_ade text,
  banco_financeira text,
  data_contrato date not null default current_date,
  valor numeric(14,2),
  responsavel_digitacao text not null check (responsavel_digitacao in ('Marcelino', 'Samila')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arquivo_documentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.arquivo_clientes(id) on delete cascade,
  contrato_id uuid references public.arquivo_contratos(id) on delete cascade,
  categoria text not null,
  nome_original text not null,
  storage_key text not null unique,
  mime_type text,
  tamanho_bytes bigint not null default 0,
  responsavel text not null check (responsavel in ('Marcelino', 'Samila')),
  deleted_at timestamptz,
  deleted_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.arquivo_historico (
  id bigint generated always as identity primary key,
  cliente_id uuid references public.arquivo_clientes(id) on delete cascade,
  contrato_id uuid references public.arquivo_contratos(id) on delete cascade,
  documento_id uuid references public.arquivo_documentos(id) on delete set null,
  acao text not null,
  responsavel text not null,
  detalhes text,
  created_at timestamptz not null default now()
);

create index if not exists arquivo_clientes_nome_idx on public.arquivo_clientes using gin (to_tsvector('portuguese', nome));
create index if not exists arquivo_clientes_cpf_idx on public.arquivo_clientes(cpf);
create index if not exists arquivo_contratos_cliente_idx on public.arquivo_contratos(cliente_id);
create index if not exists arquivo_documentos_cliente_idx on public.arquivo_documentos(cliente_id);
create index if not exists arquivo_documentos_contrato_idx on public.arquivo_documentos(contrato_id);
create index if not exists arquivo_documentos_lixeira_idx on public.arquivo_documentos(deleted_at);

alter table public.arquivo_clientes enable row level security;
alter table public.arquivo_contratos enable row level security;
alter table public.arquivo_documentos enable row level security;
alter table public.arquivo_historico enable row level security;

drop policy if exists "painel autenticado clientes" on public.arquivo_clientes;
create policy "painel autenticado clientes" on public.arquivo_clientes
  for all to authenticated using (true) with check (true);

drop policy if exists "painel autenticado contratos" on public.arquivo_contratos;
create policy "painel autenticado contratos" on public.arquivo_contratos
  for all to authenticated using (true) with check (true);

drop policy if exists "painel autenticado documentos" on public.arquivo_documentos;
create policy "painel autenticado documentos" on public.arquivo_documentos
  for all to authenticated using (true) with check (true);

drop policy if exists "painel autenticado historico" on public.arquivo_historico;
create policy "painel autenticado historico" on public.arquivo_historico
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.arquivo_clientes to authenticated;
grant select, insert, update, delete on public.arquivo_contratos to authenticated;
grant select, insert, update, delete on public.arquivo_documentos to authenticated;
grant select, insert, update, delete on public.arquivo_historico to authenticated;
grant usage, select on sequence public.arquivo_historico_id_seq to authenticated;

create or replace function public.set_arquivo_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists arquivo_clientes_updated_at on public.arquivo_clientes;
create trigger arquivo_clientes_updated_at before update on public.arquivo_clientes
for each row execute function public.set_arquivo_updated_at();

drop trigger if exists arquivo_contratos_updated_at on public.arquivo_contratos;
create trigger arquivo_contratos_updated_at before update on public.arquivo_contratos
for each row execute function public.set_arquivo_updated_at();
