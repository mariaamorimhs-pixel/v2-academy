-- Implantação híbrida HSystem: tabelas, regras de acesso (RLS) e funções.
-- Tudo com prefixo impl_. Não altera nada que já exista no projeto.
-- Para instalar: Supabase → SQL Editor → New query → colar este arquivo inteiro → Run.

create table public.impl_hoteis (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text,
  analista_id uuid,
  status_sense text,
  sensedata_id text unique,
  teste boolean not null default false,
  ultima_atividade timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

create table public.impl_usuarios (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  nome text not null,
  perfil text not null check (perfil in ('cliente', 'analista', 'editora')),
  hotel_id uuid references public.impl_hoteis(id) on delete cascade,
  calendly text,
  sensedata_contato_id text,
  convidado_em timestamptz,
  criado_em timestamptz not null default now(),
  check (perfil <> 'cliente' or hotel_id is not null)
);
alter table public.impl_hoteis add constraint impl_hoteis_analista_fk foreign key (analista_id) references public.impl_usuarios(id) on delete set null;
create index on public.impl_usuarios (hotel_id);
create index on public.impl_hoteis (analista_id);

create table public.impl_contratos (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.impl_hoteis(id) on delete cascade,
  plano text not null,
  fim date,
  sensedata_contrato_id text unique
);
create index on public.impl_contratos (hotel_id);

create table public.impl_passos_feitos (
  hotel_id uuid not null references public.impl_hoteis(id) on delete cascade,
  passo_id text not null,
  por_usuario uuid references public.impl_usuarios(id) on delete set null,
  por_nome text not null,
  em timestamptz not null default now(),
  primary key (hotel_id, passo_id)
);

create table public.impl_reunioes (
  hotel_id uuid not null references public.impl_hoteis(id) on delete cascade,
  numero int not null check (numero between 1 and 3),
  agendada_para timestamptz,
  agendada_em timestamptz,
  realizada_em timestamptz,
  realizada_por text,
  primary key (hotel_id, numero)
);

create table public.impl_conteudo (
  passo_id text primary key,
  titulo text,
  video text,
  texto text,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

-- ---- quem é o usuário logado (pelo e-mail do login) ----
create function public.impl_eu() returns public.impl_usuarios
language sql stable security definer set search_path = public as $$
  select * from public.impl_usuarios where email = lower(auth.jwt() ->> 'email') limit 1;
$$;

create function public.impl_pode_ver_hotel(p_hotel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case (public.impl_eu()).perfil
    when 'editora' then true
    when 'analista' then exists (select 1 from public.impl_hoteis h where h.id = p_hotel and h.analista_id = (public.impl_eu()).id)
    when 'cliente' then (public.impl_eu()).hotel_id = p_hotel
    else false end;
$$;

-- ---- leitura protegida; gravação só pelas funções abaixo ----
alter table public.impl_hoteis enable row level security;
alter table public.impl_usuarios enable row level security;
alter table public.impl_contratos enable row level security;
alter table public.impl_passos_feitos enable row level security;
alter table public.impl_reunioes enable row level security;
alter table public.impl_conteudo enable row level security;

create policy impl_hoteis_ver on public.impl_hoteis for select to authenticated using (public.impl_pode_ver_hotel(id));
create policy impl_contratos_ver on public.impl_contratos for select to authenticated using (public.impl_pode_ver_hotel(hotel_id));
create policy impl_passos_ver on public.impl_passos_feitos for select to authenticated using (public.impl_pode_ver_hotel(hotel_id));
create policy impl_reunioes_ver on public.impl_reunioes for select to authenticated using (public.impl_pode_ver_hotel(hotel_id));
create policy impl_conteudo_ver on public.impl_conteudo for select to authenticated using ((public.impl_eu()).id is not null);
-- cada um vê a si mesmo; analistas e editora são visíveis a todos (nome e Calendly);
-- contatos de um hotel são visíveis a quem vê o hotel.
create policy impl_usuarios_ver on public.impl_usuarios for select to authenticated using (
  email = lower(auth.jwt() ->> 'email')
  or ((public.impl_eu()).id is not null and perfil in ('analista', 'editora'))
  or (hotel_id is not null and public.impl_pode_ver_hotel(hotel_id))
);

revoke all on public.impl_hoteis, public.impl_usuarios, public.impl_contratos, public.impl_passos_feitos, public.impl_reunioes, public.impl_conteudo from anon, authenticated;
grant select on public.impl_hoteis, public.impl_usuarios, public.impl_contratos, public.impl_passos_feitos, public.impl_reunioes, public.impl_conteudo to authenticated;

-- ---- ações ----
create function public.impl_exigir(p_ok boolean) returns void language plpgsql set search_path = public as $$
begin
  if not coalesce(p_ok, false) then raise exception 'Sem permissão para esta ação' using errcode = '42501'; end if;
end $$;

create function public.impl_concluir_passo(p_hotel uuid, p_passo text) returns void
language plpgsql security definer set search_path = public as $$
declare eu public.impl_usuarios := public.impl_eu();
begin
  perform public.impl_exigir(eu.perfil = 'editora' or (eu.perfil = 'cliente' and eu.hotel_id = p_hotel));
  insert into public.impl_passos_feitos (hotel_id, passo_id, por_usuario, por_nome) values (p_hotel, p_passo, eu.id, eu.nome)
  on conflict do nothing;
  update public.impl_hoteis set ultima_atividade = now() where id = p_hotel;
end $$;

create function public.impl_agendar_reuniao(p_hotel uuid, p_numero int, p_quando timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare eu public.impl_usuarios := public.impl_eu();
begin
  perform public.impl_exigir(eu.perfil = 'editora' or (eu.perfil = 'cliente' and eu.hotel_id = p_hotel));
  insert into public.impl_reunioes (hotel_id, numero, agendada_para, agendada_em) values (p_hotel, p_numero, p_quando, now())
  on conflict (hotel_id, numero) do update set agendada_para = excluded.agendada_para, agendada_em = now();
  update public.impl_hoteis set ultima_atividade = now() where id = p_hotel;
end $$;

create function public.impl_reuniao_realizada(p_hotel uuid, p_numero int) returns void
language plpgsql security definer set search_path = public as $$
declare eu public.impl_usuarios := public.impl_eu();
begin
  perform public.impl_exigir(eu.perfil = 'editora'
    or (eu.perfil = 'analista' and exists (select 1 from public.impl_hoteis where id = p_hotel and analista_id = eu.id)));
  insert into public.impl_reunioes (hotel_id, numero, realizada_em, realizada_por) values (p_hotel, p_numero, now(), eu.nome)
  on conflict (hotel_id, numero) do update set realizada_em = now(), realizada_por = eu.nome;
  update public.impl_hoteis set ultima_atividade = now() where id = p_hotel;
end $$;

create function public.impl_salvar_conteudo(p_passo text, p_titulo text, p_video text, p_texto text) returns void
language plpgsql security definer set search_path = public as $$
declare eu public.impl_usuarios := public.impl_eu();
begin
  perform public.impl_exigir(eu.perfil = 'editora');
  insert into public.impl_conteudo (passo_id, titulo, video, texto, atualizado_em, atualizado_por)
  values (p_passo, p_titulo, p_video, p_texto, now(), eu.nome)
  on conflict (passo_id) do update set titulo = excluded.titulo, video = excluded.video, texto = excluded.texto,
    atualizado_em = now(), atualizado_por = eu.nome;
end $$;

create function public.impl_restaurar_conteudo(p_passo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'editora');
  delete from public.impl_conteudo where passo_id = p_passo;
end $$;

-- cadastra (p_id nulo) ou atualiza um analista
create function public.impl_salvar_analista(p_id uuid, p_nome text, p_email text, p_calendly text) returns uuid
language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'editora');
  if p_id is null then
    insert into public.impl_usuarios (nome, email, perfil, calendly) values (trim(p_nome), lower(trim(p_email)), 'analista', nullif(trim(p_calendly), ''))
    returning id into novo;
    return novo;
  end if;
  update public.impl_usuarios set nome = trim(p_nome), email = lower(trim(p_email)), calendly = nullif(trim(p_calendly), '')
  where id = p_id and perfil = 'analista';
  return p_id;
end $$;

-- só para hotéis de teste: apaga o progresso para testar a jornada de novo
create function public.impl_zerar_hotel_teste(p_hotel uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'editora');
  perform public.impl_exigir((select teste from public.impl_hoteis where id = p_hotel));
  delete from public.impl_passos_feitos where hotel_id = p_hotel;
  delete from public.impl_reunioes where hotel_id = p_hotel;
  update public.impl_hoteis set ultima_atividade = now() where id = p_hotel;
end $$;

revoke execute on function public.impl_eu(), public.impl_pode_ver_hotel(uuid), public.impl_exigir(boolean),
  public.impl_concluir_passo(uuid, text), public.impl_agendar_reuniao(uuid, int, timestamptz), public.impl_reuniao_realizada(uuid, int),
  public.impl_salvar_conteudo(text, text, text, text), public.impl_restaurar_conteudo(text),
  public.impl_salvar_analista(uuid, text, text, text), public.impl_zerar_hotel_teste(uuid) from public, anon;
grant execute on function public.impl_eu(), public.impl_pode_ver_hotel(uuid), public.impl_exigir(boolean),
  public.impl_concluir_passo(uuid, text), public.impl_agendar_reuniao(uuid, int, timestamptz), public.impl_reuniao_realizada(uuid, int),
  public.impl_salvar_conteudo(text, text, text, text), public.impl_restaurar_conteudo(text),
  public.impl_salvar_analista(uuid, text, text, text), public.impl_zerar_hotel_teste(uuid) to authenticated;
