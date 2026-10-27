-- Pesquisas públicas (estilo landing page): abrem por link sem login, respostas anônimas e, ao enviar,
-- a pessoa é levada para o endereço escolhido. Só o admin cria, edita e vê as respostas.
--
-- perguntas (jsonb): [{ id, tipo: 'texto' | 'texto_longo' | 'escolha_uma' | 'escolha_varias', titulo, obrigatoria, opcoes: [] }]

create table public.impl_pesquisas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null,
  descricao text,
  perguntas jsonb not null default '[]'::jsonb,
  texto_botao text not null default 'Enviar respostas',
  redirecionar_url text check (redirecionar_url is null or redirecionar_url ~ '^https?://'),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.impl_respostas (
  id bigint generated always as identity primary key,
  pesquisa_id uuid not null references public.impl_pesquisas(id) on delete cascade,
  respostas jsonb not null,          -- { <id da pergunta>: "texto" | ["opção", ...] }
  parametros jsonb,                  -- parâmetros do link (ex.: utm_source), se houver
  criado_em timestamptz not null default now()
);
create index on public.impl_respostas (pesquisa_id, criado_em desc);

alter table public.impl_pesquisas enable row level security;
alter table public.impl_respostas enable row level security;
create policy impl_pesquisas_admin on public.impl_pesquisas for select to authenticated using ((public.impl_eu()).perfil = 'admin');
create policy impl_respostas_admin on public.impl_respostas for select to authenticated using ((public.impl_eu()).perfil = 'admin');
revoke all on public.impl_pesquisas, public.impl_respostas from anon, authenticated;
grant select on public.impl_pesquisas, public.impl_respostas to authenticated;

-- ---- público (sem login) ----

-- Pesquisa ativa pelo link; devolve só o que a página precisa.
create or replace function public.impl_pesquisa_publica(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('titulo', titulo, 'descricao', descricao, 'perguntas', perguntas,
                            'texto_botao', texto_botao, 'redirecionar_url', redirecionar_url)
  from impl_pesquisas where slug = lower(p_slug) and ativa;
$$;

-- Grava uma resposta anônima. Confere se a pesquisa está ativa, as obrigatórias e se as opções existem.
create or replace function public.impl_responder_pesquisa(p_slug text, p_respostas jsonb, p_parametros jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare pq impl_pesquisas; perg jsonb; valor jsonb; limpo jsonb := '{}'::jsonb;
begin
  select * into pq from impl_pesquisas where slug = lower(p_slug) and ativa;
  if not found then raise exception 'Esta pesquisa não está disponível.'; end if;
  if p_respostas is null or jsonb_typeof(p_respostas) <> 'object' or length(p_respostas::text) > 50000 then
    raise exception 'Respostas inválidas.';
  end if;

  for perg in select * from jsonb_array_elements(pq.perguntas) loop
    valor := p_respostas -> (perg->>'id');
    if perg->>'tipo' in ('texto', 'texto_longo') then
      if valor is not null and jsonb_typeof(valor) <> 'string' then raise exception 'Resposta inválida.'; end if;
      if coalesce(trim(valor #>> '{}'), '') = '' then valor := null; end if;
    elsif perg->>'tipo' = 'escolha_uma' then
      if valor is not null and (jsonb_typeof(valor) <> 'string' or not (perg->'opcoes' ? (valor #>> '{}'))) then raise exception 'Opção inválida.'; end if;
    else -- escolha_varias
      if valor is not null and (jsonb_typeof(valor) <> 'array'
          or exists (select 1 from jsonb_array_elements_text(valor) o where not (perg->'opcoes' ? o))) then raise exception 'Opção inválida.'; end if;
      if valor = '[]'::jsonb then valor := null; end if;
    end if;
    if valor is null and coalesce((perg->>'obrigatoria')::boolean, false) then
      raise exception 'Responda a pergunta: %', perg->>'titulo';
    end if;
    if valor is not null then limpo := limpo || jsonb_build_object(perg->>'id', valor); end if;
  end loop;

  insert into impl_respostas (pesquisa_id, respostas, parametros)
  values (pq.id, limpo, case when jsonb_typeof(p_parametros) = 'object' and length(p_parametros::text) < 2000 then p_parametros end);
end $$;

revoke execute on function public.impl_pesquisa_publica(text), public.impl_responder_pesquisa(text, jsonb, jsonb) from public;
grant execute on function public.impl_pesquisa_publica(text), public.impl_responder_pesquisa(text, jsonb, jsonb) to anon, authenticated;

-- ---- admin ----

-- Cria (p_id nulo) ou atualiza uma pesquisa. Devolve o id.
create or replace function public.impl_salvar_pesquisa(p_id uuid, p_slug text, p_titulo text, p_descricao text, p_perguntas jsonb,
  p_texto_botao text, p_redirecionar_url text, p_ativa boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare novo uuid; v_slug text := lower(trim(p_slug));
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'admin');
  if coalesce(trim(p_titulo), '') = '' then raise exception 'Informe o título da pesquisa.'; end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'O endereço da pesquisa só pode ter letras sem acento, números e hífens.'; end if;
  if exists (select 1 from impl_pesquisas where slug = v_slug and id is distinct from p_id) then raise exception 'Já existe uma pesquisa com o endereço %.', v_slug; end if;
  if nullif(trim(p_redirecionar_url), '') !~ '^https?://' then raise exception 'O endereço de redirecionamento precisa começar com https://'; end if;
  if jsonb_typeof(p_perguntas) <> 'array' then raise exception 'Perguntas inválidas.'; end if;

  if p_id is null then
    insert into impl_pesquisas (slug, titulo, descricao, perguntas, texto_botao, redirecionar_url, ativa)
    values (v_slug, trim(p_titulo), nullif(trim(p_descricao), ''), p_perguntas, coalesce(nullif(trim(p_texto_botao), ''), 'Enviar respostas'),
            nullif(trim(p_redirecionar_url), ''), coalesce(p_ativa, true))
    returning id into novo;
    return novo;
  end if;
  update impl_pesquisas set slug = v_slug, titulo = trim(p_titulo), descricao = nullif(trim(p_descricao), ''), perguntas = p_perguntas,
    texto_botao = coalesce(nullif(trim(p_texto_botao), ''), 'Enviar respostas'), redirecionar_url = nullif(trim(p_redirecionar_url), ''),
    ativa = coalesce(p_ativa, true), atualizado_em = now()
  where id = p_id;
  return p_id;
end $$;

-- Exclui a pesquisa e todas as respostas dela.
create or replace function public.impl_excluir_pesquisa(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'admin');
  delete from impl_pesquisas where id = p_id;
end $$;

revoke execute on function public.impl_salvar_pesquisa(uuid, text, text, text, jsonb, text, text, boolean), public.impl_excluir_pesquisa(uuid) from public, anon;
grant execute on function public.impl_salvar_pesquisa(uuid, text, text, text, jsonb, text, text, boolean), public.impl_excluir_pesquisa(uuid) to authenticated;
