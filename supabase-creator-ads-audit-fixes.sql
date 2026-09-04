-- Execute depois de supabase-creator-ads.sql.
-- Ajustes encontrados na auditoria: preservar o texto exato do termo aceito
-- e impedir que alterações futuras do texto mudem o histórico do Creator.

alter table public.creator_ads_profiles
  add column if not exists termo_texto text;

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
  v_termo text := 'TERMO DE PARTICIPAÇÃO, USO DE IMAGEM E TRATAMENTO DE DADOS\n\nDeclaro que tenho 18 anos ou mais. Autorizo a Crediti Soluções Financeiras a utilizar minha imagem, voz, nome, nome de perfil, vídeo enviado, trechos e imagens do vídeo nos canais digitais oficiais da Crediti, com ajustes técnicos de formato, corte, legenda e identidade visual sem alterar de forma enganosa o sentido do conteúdo. Concordo com o tratamento dos dados necessários para cadastro, análise, contato, participação, registro do consentimento e eventual pagamento. O envio do vídeo não garante seleção, publicação ou pagamento. Cada campanha possui regras, prazo e prêmio próprios. Bônus por visualizações somente quando estiver expressamente previsto na campanha. Este termo permanece arquivado na versão aceita pelo participante.';
begin
  if coalesce(length(trim(p_nome)),0) < 5 or position(' ' in trim(p_nome)) = 0 then raise exception 'Informe nome completo'; end if;
  if coalesce(length(regexp_replace(p_whatsapp,'\D','','g')),0) < 10 then raise exception 'WhatsApp inválido'; end if;
  if p_plataforma not in ('Instagram','TikTok','Kwai') then raise exception 'Plataforma inválida'; end if;
  if not (p_adulto and p_perfil_publico and p_uso_imagem and p_tratamento_dados) then raise exception 'Todos os consentimentos obrigatórios precisam ser aceitos'; end if;

  insert into public.creator_ads_profiles(
    nome,whatsapp,plataforma,perfil,pix_chave,pix_tipo,banco_instituicao,
    adulto_confirmado,perfil_publico_confirmado,uso_imagem_confirmado,
    tratamento_dados_confirmado,termo_texto
  ) values(
    trim(p_nome),trim(p_whatsapp),p_plataforma,trim(p_perfil),trim(p_pix_chave),
    trim(p_pix_tipo),trim(p_banco),p_adulto,p_perfil_publico,p_uso_imagem,
    p_tratamento_dados,v_termo
  ) returning * into v_row;

  return jsonb_build_object(
    'id',v_row.id,
    'public_token',v_row.public_token,
    'status',v_row.status,
    'term_version',v_row.termo_versao,
    'accepted_at',v_row.termo_aceito_em
  );
end;
$$;

grant execute on function public.creator_ads_register(text,text,text,text,text,text,text,boolean,boolean,boolean,boolean) to anon, authenticated;

create or replace function public.creator_ads_get_me(p_token uuid)
returns jsonb
language sql security definer set search_path=public as $$
  select coalesce(jsonb_build_object(
    'id',p.id,
    'nome',p.nome,
    'plataforma',p.plataforma,
    'perfil',p.perfil,
    'status',p.status,
    'seguidores_verificados',p.seguidores_verificados,
    'perfil_publico_verificado',p.perfil_publico_verificado,
    'term_version',p.termo_versao,
    'accepted_at',p.termo_aceito_em,
    'term_text',p.termo_texto
  ), '{}'::jsonb)
  from public.creator_ads_profiles p
  where p.public_token=p_token
  limit 1;
$$;

grant execute on function public.creator_ads_get_me(uuid) to anon, authenticated;
