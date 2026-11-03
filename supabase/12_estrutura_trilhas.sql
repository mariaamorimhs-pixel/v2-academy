-- Estrutura das trilhas no banco (antes era fixa em src/trilhas.js): etapas e passos de cada produto.
-- Os ids originais ("hbook-2-3") continuam, então progresso e conteúdo editado não mudam.
-- Excluir = esconder (oculta/oculto): some da trilha e da porcentagem, mas o histórico fica e dá para restaurar.

create table public.impl_etapas (
  id text primary key,
  produto text not null,
  titulo text not null,
  ordem int not null,
  somente_sem text,          -- etapa que só aparece para quem NÃO tem esse produto (ex.: HUNIT)
  nota text,
  oculta boolean not null default false,
  criado_em timestamptz not null default now()
);
create table public.impl_passos (
  id text primary key,
  etapa_id text not null references public.impl_etapas(id) on delete cascade,
  titulo text not null,
  ordem int not null,
  oculto boolean not null default false,
  criado_em timestamptz not null default now()
);
alter table public.impl_etapas enable row level security;
alter table public.impl_passos enable row level security;
create policy impl_etapas_ver on public.impl_etapas for select to authenticated using ((public.impl_eu()).id is not null);
create policy impl_passos_ver on public.impl_passos for select to authenticated using ((public.impl_eu()).id is not null);
revoke all on public.impl_etapas, public.impl_passos from anon, authenticated;
grant select on public.impl_etapas, public.impl_passos to authenticated;

insert into public.impl_etapas (id, produto, titulo, ordem, somente_sem, nota) values
  ('hbook-1', 'HBOOK', 'Comece por aqui', 1, null, null),
  ('hbook-2', 'HBOOK', 'Confira seu hotel no motor', 2, null, null),
  ('hbook-3', 'HBOOK', 'Ajuste seus preços e disponibilidade', 3, 'HUNIT', null),
  ('hbook-4', 'HBOOK', 'Veja seu motor no ar', 4, null, null),
  ('hbook-5', 'HBOOK', 'Crie relacionamento com seu hóspede', 5, null, null),
  ('hbook-6', 'HBOOK', 'Prepare sua primeira venda', 6, null, null),
  ('hbook-7', 'HBOOK', 'Leve o hóspede até o motor', 7, null, null),
  ('hbook-8', 'HBOOK', 'Acompanhe os seus resultados', 8, null, null),
  ('hunit-1', 'HUNIT', 'Comece por aqui', 1, null, null),
  ('hunit-2', 'HUNIT', 'Confira seus quartos e tarifas', 2, null, null),
  ('hunit-3', 'HUNIT', 'Atualize seus canais', 3, null, null),
  ('hunit-4', 'HUNIT', 'Leia sua grade', 4, null, null),
  ('hunit-5', 'HUNIT', 'Crie suas ofertas', 5, null, null),
  ('hunit-6', 'HUNIT', 'Encontre suas reservas', 6, null, null),
  ('hunit-7', 'HUNIT', 'Acompanhe os seus resultados', 7, null, null),
  ('hbot-1', 'HBOT', 'Comece por aqui', 1, null, null),
  ('hbot-2', 'HBOT', 'Monte sua equipe de atendimento', 2, null, null),
  ('hbot-3', 'HBOT', 'Defina as regras do seu atendimento', 3, null, null),
  ('hbot-4', 'HBOT', 'Veja as reservas do atendente', 4, null, null),
  ('hbot-5', 'HBOT', 'Organize seus contatos', 5, null, null),
  ('hbot-6', 'HBOT', 'Ensine seu atendente', 6, null, 'Inclui o teste no Web Chat'),
  ('hbot-7', 'HBOT', 'Assuma uma conversa', 7, null, null),
  ('hbot-8', 'HBOT', 'Acompanhe os seus resultados', 8, null, null),
  ('hbot-9', 'HBOT', 'Prepare sua conexão', 9, null, 'Inclui Canais → Web'),
  ('hprice-1', 'HPRICE', 'Comece por aqui', 1, null, null),
  ('hprice-2', 'HPRICE', 'Acompanhe o mercado', 2, null, null),
  ('hprice-3', 'HPRICE', 'Compare seus preços', 3, null, null),
  ('hprice-4', 'HPRICE', 'Marque suas datas e alertas', 4, null, null),
  ('hprice-5', 'HPRICE', 'Crie suas regras de preço', 5, null, null),
  ('hprice-6', 'HPRICE', 'Planeje seu calendário', 6, null, null),
  ('hprice-7', 'HPRICE', 'Acompanhe os seus resultados', 7, null, null)
on conflict (id) do nothing;

insert into public.impl_passos (id, etapa_id, titulo, ordem) values
  ('hbook-1-1', 'hbook-1', 'Comece por aqui', 1),
  ('hbook-2-1', 'hbook-2', 'Propriedade', 1),
  ('hbook-2-2', 'hbook-2', 'Quartos e tarifas', 2),
  ('hbook-2-3', 'hbook-2', 'Extras', 3),
  ('hbook-2-4', 'hbook-2', 'Integrações', 4),
  ('hbook-2-5', 'hbook-2', 'Parte 5', 5),
  ('hbook-3-1', 'hbook-3', 'Ajuste seus preços e disponibilidade', 1),
  ('hbook-4-1', 'hbook-4', 'Veja seu motor no ar', 1),
  ('hbook-5-1', 'hbook-5', 'E-mail automático', 1),
  ('hbook-5-2', 'hbook-5', 'Recuperação de reservas', 2),
  ('hbook-5-3', 'hbook-5', 'Pré e pós check-in', 3),
  ('hbook-5-4', 'hbook-5', 'Aniversário', 4),
  ('hbook-6-1', 'hbook-6', 'Ofertas', 1),
  ('hbook-6-2', 'hbook-6', 'Promoções', 2),
  ('hbook-6-3', 'hbook-6', 'Pacotes', 3),
  ('hbook-7-1', 'hbook-7', 'Leve o hóspede até o motor', 1),
  ('hbook-8-1', 'hbook-8', 'Acompanhe os seus resultados', 1),
  ('hunit-1-1', 'hunit-1', 'Comece por aqui', 1),
  ('hunit-2-1', 'hunit-2', 'Parte 1', 1),
  ('hunit-2-2', 'hunit-2', 'Parte 2', 2),
  ('hunit-3-1', 'hunit-3', 'Parte 1', 1),
  ('hunit-3-2', 'hunit-3', 'Parte 2', 2),
  ('hunit-4-1', 'hunit-4', 'Parte 1', 1),
  ('hunit-4-2', 'hunit-4', 'Parte 2', 2),
  ('hunit-5-1', 'hunit-5', 'Crie suas ofertas', 1),
  ('hunit-6-1', 'hunit-6', 'Encontre suas reservas', 1),
  ('hunit-7-1', 'hunit-7', 'Acompanhe os seus resultados', 1),
  ('hbot-1-1', 'hbot-1', 'Comece por aqui', 1),
  ('hbot-2-1', 'hbot-2', 'Monte sua equipe de atendimento', 1),
  ('hbot-3-1', 'hbot-3', 'Parte 1', 1),
  ('hbot-3-2', 'hbot-3', 'Parte 2', 2),
  ('hbot-4-1', 'hbot-4', 'Veja as reservas do atendente', 1),
  ('hbot-5-1', 'hbot-5', 'Organize seus contatos', 1),
  ('hbot-6-1', 'hbot-6', 'Ensine seu atendente', 1),
  ('hbot-7-1', 'hbot-7', 'Assuma uma conversa', 1),
  ('hbot-8-1', 'hbot-8', 'Acompanhe os seus resultados', 1),
  ('hbot-9-1', 'hbot-9', 'Parte 1', 1),
  ('hbot-9-2', 'hbot-9', 'Parte 2', 2),
  ('hbot-9-3', 'hbot-9', 'Parte 3', 3),
  ('hbot-9-4', 'hbot-9', 'Parte 4', 4),
  ('hbot-9-5', 'hbot-9', 'Parte 5', 5),
  ('hprice-1-1', 'hprice-1', 'Comece por aqui', 1),
  ('hprice-2-1', 'hprice-2', 'Acompanhe o mercado', 1),
  ('hprice-3-1', 'hprice-3', 'Compare seus preços', 1),
  ('hprice-4-1', 'hprice-4', 'Marque suas datas e alertas', 1),
  ('hprice-5-1', 'hprice-5', 'Parte 1', 1),
  ('hprice-5-2', 'hprice-5', 'Parte 2', 2),
  ('hprice-5-3', 'hprice-5', 'Parte 3', 3),
  ('hprice-5-4', 'hprice-5', 'Parte 4', 4),
  ('hprice-5-5', 'hprice-5', 'Parte 5', 5),
  ('hprice-6-1', 'hprice-6', 'Planeje seu calendário', 1),
  ('hprice-7-1', 'hprice-7', 'Parte 1', 1),
  ('hprice-7-2', 'hprice-7', 'Parte 2', 2)
on conflict (id) do nothing;

-- Edição da trilha (só admin). Ações:
--   nova_etapa (alvo = produto, texto = título) · renomear_etapa · excluir_etapa · restaurar_etapa · subir_etapa · descer_etapa
--   novo_passo (alvo = etapa, texto = título) · excluir_passo · restaurar_passo · subir_passo · descer_passo
-- Devolve o id criado (ou o alvo).
create or replace function public.impl_editar_trilha(p_acao text, p_alvo text, p_texto text default null)
returns text language plpgsql security definer set search_path = public as $$
declare novo text; et impl_etapas; ps impl_passos; vizinho record; sufixo text := substr(md5(random()::text), 1, 6);
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'admin');

  if p_acao = 'nova_etapa' then
    if coalesce(trim(p_texto), '') = '' then raise exception 'Informe o nome da etapa.'; end if;
    novo := lower(p_alvo) || '-x' || sufixo;
    insert into impl_etapas (id, produto, titulo, ordem)
    values (novo, upper(p_alvo), trim(p_texto), coalesce((select max(ordem) from impl_etapas where produto = upper(p_alvo)), 0) + 1);
    return novo;
  elsif p_acao = 'novo_passo' then
    if coalesce(trim(p_texto), '') = '' then raise exception 'Informe o nome do passo.'; end if;
    if not exists (select 1 from impl_etapas where id = p_alvo) then raise exception 'Etapa não encontrada.'; end if;
    novo := p_alvo || '-x' || sufixo;
    insert into impl_passos (id, etapa_id, titulo, ordem)
    values (novo, p_alvo, trim(p_texto), coalesce((select max(ordem) from impl_passos where etapa_id = p_alvo), 0) + 1);
    return novo;
  elsif p_acao = 'renomear_etapa' then
    if coalesce(trim(p_texto), '') = '' then raise exception 'Informe o nome da etapa.'; end if;
    update impl_etapas set titulo = trim(p_texto) where id = p_alvo;
  elsif p_acao in ('excluir_etapa', 'restaurar_etapa') then
    update impl_etapas set oculta = (p_acao = 'excluir_etapa') where id = p_alvo;
  elsif p_acao in ('excluir_passo', 'restaurar_passo') then
    update impl_passos set oculto = (p_acao = 'excluir_passo') where id = p_alvo;
  elsif p_acao in ('subir_etapa', 'descer_etapa') then
    select * into et from impl_etapas where id = p_alvo;
    select id, ordem into vizinho from impl_etapas
      where produto = et.produto and not oculta and id <> et.id
        and (case when p_acao = 'subir_etapa' then ordem < et.ordem else ordem > et.ordem end)
      order by case when p_acao = 'subir_etapa' then -ordem else ordem end limit 1;
    if vizinho.id is not null then
      update impl_etapas set ordem = vizinho.ordem where id = et.id;
      update impl_etapas set ordem = et.ordem where id = vizinho.id;
    end if;
  elsif p_acao in ('subir_passo', 'descer_passo') then
    select * into ps from impl_passos where id = p_alvo;
    select id, ordem into vizinho from impl_passos
      where etapa_id = ps.etapa_id and not oculto and id <> ps.id
        and (case when p_acao = 'subir_passo' then ordem < ps.ordem else ordem > ps.ordem end)
      order by case when p_acao = 'subir_passo' then -ordem else ordem end limit 1;
    if vizinho.id is not null then
      update impl_passos set ordem = vizinho.ordem where id = ps.id;
      update impl_passos set ordem = ps.ordem where id = vizinho.id;
    end if;
  else
    raise exception 'Ação inválida.';
  end if;
  return p_alvo;
end $$;
revoke execute on function public.impl_editar_trilha(text, text, text) from public, anon;
grant execute on function public.impl_editar_trilha(text, text, text) to authenticated;
