-- Treinamentos gravados: gravações das turmas ao vivo, por treinamento (hbook, hunit-hcorp, hprice — ids de
-- TREINAMENTOS_GRUPO em src/trilhas.js). Todo usuário logado vê todas; só o admin cadastra.

create table public.impl_gravacoes (
  id uuid primary key default gen_random_uuid(),
  treino_id text not null,
  titulo text not null,
  descricao text,
  video text not null,               -- link do YouTube (por enquanto)
  gravado_em date,
  criado_em timestamptz not null default now()
);
create index on public.impl_gravacoes (treino_id, gravado_em desc);

alter table public.impl_gravacoes enable row level security;
create policy impl_gravacoes_ver on public.impl_gravacoes for select to authenticated using ((public.impl_eu()).id is not null);
revoke all on public.impl_gravacoes from anon, authenticated;
grant select on public.impl_gravacoes to authenticated;

-- Cria (p_id nulo) ou atualiza uma gravação.
create or replace function public.impl_salvar_gravacao(p_id uuid, p_treino text, p_titulo text, p_descricao text, p_video text, p_gravado_em date)
returns uuid language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'admin');
  if coalesce(trim(p_treino), '') = '' then raise exception 'Escolha o treinamento.'; end if;
  if coalesce(trim(p_titulo), '') = '' then raise exception 'Informe o título.'; end if;
  if coalesce(trim(p_video), '') !~ '^https://' then raise exception 'Informe o link do vídeo (começando com https://).'; end if;
  if p_id is null then
    insert into impl_gravacoes (treino_id, titulo, descricao, video, gravado_em)
    values (trim(p_treino), trim(p_titulo), nullif(trim(p_descricao), ''), trim(p_video), p_gravado_em)
    returning id into novo;
    return novo;
  end if;
  update impl_gravacoes set treino_id = trim(p_treino), titulo = trim(p_titulo), descricao = nullif(trim(p_descricao), ''),
    video = trim(p_video), gravado_em = p_gravado_em
  where id = p_id;
  return p_id;
end $$;

create or replace function public.impl_excluir_gravacao(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'admin');
  delete from impl_gravacoes where id = p_id;
end $$;

revoke execute on function public.impl_salvar_gravacao(uuid, text, text, text, text, date), public.impl_excluir_gravacao(uuid) from public, anon;
grant execute on function public.impl_salvar_gravacao(uuid, text, text, text, text, date), public.impl_excluir_gravacao(uuid) to authenticated;
