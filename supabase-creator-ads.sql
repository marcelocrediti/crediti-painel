create extension if not exists pgcrypto;

create table if not exists public.creator_ads_profiles (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null default gen_random_uuid() unique,
  nome text not null,
  whatsapp text not null,
  plataforma text not null check (plataforma in ('Instagram','TikTok','Kwai')),
  perfil text not null,
  pix_chave text not null,
  pix_tipo text not null,
  banco_instituicao text not null,
  status text not null default 'em_analise' check (status in ('em_analise','aprovado','nao_elegivel','perfil_privado','excluido_perfil_privado')),
  seguidores_verificados integer,
  perfil_publico_verificado boolean,
  termo_versao text not null default 'Creator Ads v1.0',
  termo_aceito_em timestamptz not null default now(),
  adulto_confirmado boolean not null default false,
  perfil_publico_confirmado boolean not null default false,
  uso_imagem_confirmado boolean not null default false,
  tratamento_dados_confirmado boolean not null default false,
  observacao_admin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_ads_campaigns (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  briefing text not null,
  inicio timestamptz not null,
  fim timestamptz not null,
  premio numeric(12,2) not null check (premio >= 0),
  numero_vencedores integer not null default 1 check (numero_vencedores >= 1),
  bonus_ativo boolean not null default false,
  bonus_valor numeric(12,2),
  bonus_meta_views integer,
  bonus_prazo timestamptz,
  status text not null default 'rascunho' check (status in ('rascunho','ativa','encerrada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_ads_submissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.creator_ads_profiles(id) on delete restrict,
  campaign_id uuid not null references public.creator_ads_campaigns(id) on delete restrict,
  video_path text not null,
  video_nome text,
  video_mime text,
  status text not null default 'enviado' check (status in ('enviado','em_analise','vencedor','nao_selecionado','publicado')),
  views integer not null default 0,
  vencedor_em timestamptz,
  publicado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, campaign_id)
);

create table if not exists public.creator_ads_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.creator_ads_profiles(id) on delete restrict,
  campaign_id uuid not null references public.creator_ads_campaigns(id) on delete restrict,
  submission_id uuid references public.creator_ads_submissions(id) on delete restrict,
  premio numeric(12,2) not null default 0,
  bonus numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (premio + bonus) stored,
  status text not null default 'pendente' check (status in ('pendente','pago')),
  pago_em timestamptz,
  comprovante_url text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_ads_audit (
  id bigint generated always as identity primary key,
  entidade text not null,
  entidade_id uuid,
  acao text not null,
  detalhes jsonb,
  admin_user uuid,
  created_at timestamptz not null default now()
);

create index if not exists creator_ads_profiles_status_idx on public.creator_ads_profiles(status);
create index if not exists creator_ads_campaigns_status_idx on public.creator_ads_campaigns(status);
create index if not exists creator_ads_submissions_campaign_idx on public.creator_ads_submissions(campaign_id);
create index if not exists creator_ads_submissions_profile_idx on public.creator_ads_submissions(profile_id);
create index if not exists creator_ads_payments_status_idx on public.creator_ads_payments(status);

create or replace function public.creator_ads_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='creator_ads_profiles_touch') then
    create trigger creator_ads_profiles_touch before update on public.creator_ads_profiles for each row execute function public.creator_ads_touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='creator_ads_campaigns_touch') then
    create trigger creator_ads_campaigns_touch before update on public.creator_ads_campaigns for each row execute function public.creator_ads_touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='creator_ads_submissions_touch') then
    create trigger creator_ads_submissions_touch before update on public.creator_ads_submissions for each row execute function public.creator_ads_touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='creator_ads_payments_touch') then
    create trigger creator_ads_payments_touch before update on public.creator_ads_payments for each row execute function public.creator_ads_touch_updated_at();
  end if;
end $$;

alter table public.creator_ads_profiles enable row level security;
alter table public.creator_ads_campaigns enable row level security;
alter table public.creator_ads_submissions enable row level security;
alter table public.creator_ads_payments enable row level security;
alter table public.creator_ads_audit enable row level security;

drop policy if exists "creator admin profiles" on public.creator_ads_profiles;
create policy "creator admin profiles" on public.creator_ads_profiles for all to authenticated using (true) with check (true);
drop policy if exists "creator admin campaigns" on public.creator_ads_campaigns;
create policy "creator admin campaigns" on public.creator_ads_campaigns for all to authenticated using (true) with check (true);
drop policy if exists "creator admin submissions" on public.creator_ads_submissions;
create policy "creator admin submissions" on public.creator_ads_submissions for all to authenticated using (true) with check (true);
drop policy if exists "creator admin payments" on public.creator_ads_payments;
create policy "creator admin payments" on public.creator_ads_payments for all to authenticated using (true) with check (true);
drop policy if exists "creator admin audit" on public.creator_ads_audit;
create policy "creator admin audit" on public.creator_ads_audit for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.creator_ads_profiles to authenticated;
grant select, insert, update, delete on public.creator_ads_campaigns to authenticated;
grant select, insert, update, delete on public.creator_ads_submissions to authenticated;
grant select, insert, update, delete on public.creator_ads_payments to authenticated;
grant select, insert on public.creator_ads_audit to authenticated;
grant usage, select on sequence public.creator_ads_audit_id_seq to authenticated;

create or replace function public.creator_ads_register(
  p_nome text,
  p_whatsapp text,
  p_plataforma text,
  p_perfil text,
  p_pix_chave text,
  p_pix_tipo text,
  p_banco text,
  p_adulto boolean,
  p_perfil_publico boolean,
  p_uso_imagem boolean,
  p_tratamento_dados boolean
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_row public.creator_ads_profiles;
begin
  if coalesce(length(trim(p_nome)),0) < 5 or position(' ' in trim(p_nome)) = 0 then raise exception 'Informe nome completo'; end if;
  if coalesce(length(regexp_replace(p_whatsapp,'\D','','g')),0) < 10 then raise exception 'WhatsApp inválido'; end if;
  if p_plataforma not in ('Instagram','TikTok','Kwai') then raise exception 'Plataforma inválida'; end if;
  if not (p_adulto and p_perfil_publico and p_uso_imagem and p_tratamento_dados) then raise exception 'Todos os consentimentos obrigatórios precisam ser aceitos'; end if;
  insert into public.creator_ads_profiles(nome,whatsapp,plataforma,perfil,pix_chave,pix_tipo,banco_instituicao,adulto_confirmado,perfil_publico_confirmado,uso_imagem_confirmado,tratamento_dados_confirmado)
  values(trim(p_nome),trim(p_whatsapp),p_plataforma,trim(p_perfil),trim(p_pix_chave),trim(p_pix_tipo),trim(p_banco),p_adulto,p_perfil_publico,p_uso_imagem,p_tratamento_dados)
  returning * into v_row;
  return jsonb_build_object('id',v_row.id,'public_token',v_row.public_token,'status',v_row.status,'term_version',v_row.termo_versao,'accepted_at',v_row.termo_aceito_em);
end;
$$;

grant execute on function public.creator_ads_register(text,text,text,text,text,text,text,boolean,boolean,boolean,boolean) to anon, authenticated;

create or replace function public.creator_ads_get_me(p_token uuid)
returns jsonb
language sql security definer set search_path=public as $$
  select coalesce(jsonb_build_object(
    'id',p.id,'nome',p.nome,'plataforma',p.plataforma,'perfil',p.perfil,'status',p.status,
    'seguidores_verificados',p.seguidores_verificados,'perfil_publico_verificado',p.perfil_publico_verificado,
    'term_version',p.termo_versao,'accepted_at',p.termo_aceito_em
  ), '{}'::jsonb)
  from public.creator_ads_profiles p where p.public_token=p_token limit 1;
$$;

grant execute on function public.creator_ads_get_me(uuid) to anon, authenticated;

create or replace function public.creator_ads_public_campaigns(p_token uuid)
returns table(
  id uuid, titulo text, descricao text, briefing text, inicio timestamptz, fim timestamptz,
  premio numeric, numero_vencedores integer, bonus_ativo boolean, bonus_valor numeric, bonus_meta_views integer, bonus_prazo timestamptz
)
language sql security definer set search_path=public as $$
  select c.id,c.titulo,c.descricao,c.briefing,c.inicio,c.fim,c.premio,c.numero_vencedores,c.bonus_ativo,c.bonus_valor,c.bonus_meta_views,c.bonus_prazo
  from public.creator_ads_campaigns c
  where c.status='ativa' and now() between c.inicio and c.fim
    and exists(select 1 from public.creator_ads_profiles p where p.public_token=p_token and p.status='aprovado')
  order by c.fim asc;
$$;

grant execute on function public.creator_ads_public_campaigns(uuid) to anon, authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('creator-ads-videos','creator-ads-videos',false,52428800,array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public=false,file_size_limit=52428800,allowed_mime_types=array['video/mp4','video/quicktime','video/webm'];

drop policy if exists "creator anon upload video" on storage.objects;
create policy "creator anon upload video" on storage.objects for insert to anon with check (bucket_id='creator-ads-videos');
drop policy if exists "creator admin videos" on storage.objects;
create policy "creator admin videos" on storage.objects for all to authenticated using (bucket_id='creator-ads-videos') with check (bucket_id='creator-ads-videos');

create or replace function public.creator_ads_submit_video(p_token uuid,p_campaign uuid,p_video_path text,p_video_nome text,p_video_mime text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile uuid; v_status text; v_submission uuid;
begin
  select id,status into v_profile,v_status from public.creator_ads_profiles where public_token=p_token;
  if v_profile is null then raise exception 'Cadastro não encontrado'; end if;
  if v_status<>'aprovado' then raise exception 'Perfil ainda não está aprovado'; end if;
  if not exists(select 1 from public.creator_ads_campaigns where id=p_campaign and status='ativa' and now() between inicio and fim) then raise exception 'Campanha indisponível'; end if;
  insert into public.creator_ads_submissions(profile_id,campaign_id,video_path,video_nome,video_mime)
  values(v_profile,p_campaign,p_video_path,p_video_nome,p_video_mime)
  returning id into v_submission;
  return jsonb_build_object('id',v_submission,'status','enviado');
end;
$$;

grant execute on function public.creator_ads_submit_video(uuid,uuid,text,text,text) to anon, authenticated;
