-- Inscrições nos treinamentos ao vivo em grupo, registradas quando a pessoa se inscreve pela janela do
-- Calendly dentro do Academy. Guarda a última inscrição de cada hotel em cada turma.
-- Rodar depois do 01_estrutura.sql.

create table public.impl_inscricoes (
  hotel_id uuid not null references public.impl_hoteis(id) on delete cascade,
  treino_id text not null,
  por_usuario uuid references public.impl_usuarios(id) on delete set null,
  por_nome text not null,
  em timestamptz not null default now(),
  primary key (hotel_id, treino_id)
);

alter table public.impl_inscricoes enable row level security;
create policy impl_inscricoes_ver on public.impl_inscricoes for select to authenticated using (public.impl_pode_ver_hotel(hotel_id));
revoke all on public.impl_inscricoes from anon, authenticated;
grant select on public.impl_inscricoes to authenticated;

create function public.impl_registrar_inscricao(p_hotel uuid, p_treino text) returns void
language plpgsql security definer set search_path = public as $$
declare eu public.impl_usuarios := public.impl_eu();
begin
  perform public.impl_exigir(eu.perfil = 'editora' or (eu.perfil = 'cliente' and eu.hotel_id = p_hotel));
  perform public.impl_exigir(p_treino in ('hbook', 'hunit-hcorp', 'hprice'));
  insert into public.impl_inscricoes (hotel_id, treino_id, por_usuario, por_nome) values (p_hotel, p_treino, eu.id, eu.nome)
  on conflict (hotel_id, treino_id) do update set por_usuario = excluded.por_usuario, por_nome = excluded.por_nome, em = now();
  update public.impl_hoteis set ultima_atividade = now() where id = p_hotel;
end $$;

revoke execute on function public.impl_registrar_inscricao(uuid, text) from public, anon;
grant execute on function public.impl_registrar_inscricao(uuid, text) to authenticated;
