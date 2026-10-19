-- Cliente parado no Academy há mais de 7 dias → tarefa para o implantador (CS) no Sensedata.
-- "Parado" = 7 dias sem avançar (concluir passo, agendar ou ter reunião) OU 7 dias sem nenhum usuário do hotel entrar.
-- Uma tarefa por parada: só cria outra quando o cliente se mexe e para de novo.
-- Não conta: hotel de teste, hotel sem convite enviado, jornada concluída, hotel com reunião agendada
-- e ainda não realizada (aí quem está devendo é a analista), hotel sem CS no Sensedata.

create table public.impl_alertas_parado (
  id bigint generated always as identity primary key,
  hotel_id uuid not null references public.impl_hoteis(id) on delete cascade,
  motivos text[] not null,               -- 'sem_avancar' e/ou 'sem_entrar'
  ref_avanco timestamptz,                -- último avanço quando a tarefa foi criada
  ref_acesso timestamptz,                -- último acesso quando a tarefa foi criada
  tarefa_id_legacy text,
  responsavel text,
  ok boolean not null default false,
  erro text,
  criado_em timestamptz not null default now()
);
create index on public.impl_alertas_parado (hotel_id, criado_em desc);
alter table public.impl_alertas_parado enable row level security;
create policy impl_alertas_parado_editora on public.impl_alertas_parado for select to authenticated
  using ((public.impl_eu()).perfil = 'editora');

-- Liga/desliga e modo de teste: somente_hoteis = lista de ids (vazia = todos). Começa só com o hotel Maria Teste.
insert into public.impl_config (chave, valor)
select 'alertas_parado', jsonb_build_object('ativo', true, 'dias', 7, 'somente_hoteis',
  coalesce((select jsonb_agg(id::text) from public.impl_hoteis where nome = 'Maria Teste' and not teste), '[]'::jsonb))
on conflict (chave) do nothing;

-- Hotéis que precisam de tarefa agora (já sem os que tiveram tarefa nesta mesma parada).
create or replace function public.impl_hoteis_parados()
returns table (hotel_id uuid, nome text, sensedata_id text, cs_email text, cs_nome text,
               ultimo_avanco timestamptz, ultimo_acesso timestamptz, motivos text[])
language sql security definer set search_path = public, auth
as $$
  with cfg as (
    select coalesce((valor->>'dias')::int, 7) as dias,
           coalesce(valor->'somente_hoteis', '[]'::jsonb) as somente,
           coalesce((valor->>'ativo')::boolean, true) as ativo
    from impl_config where chave = 'alertas_parado'
  ),
  base as (
    select h.*,
      -- blocos que o hotel tem que fechar (contratos ativos) x reuniões realizadas
      (select count(distinct case when c.plano in ('HBOOK','HUNIT','HCORP') then 1 when c.plano = 'HBOT' then 2 when c.plano = 'HPRICE' then 3 end)
         from impl_contratos c where c.hotel_id = h.id and c.plano in ('HBOOK','HUNIT','HCORP','HBOT','HPRICE')
           and (c.fim is null or c.fim >= current_date)) as blocos,
      (select count(*) from impl_reunioes r where r.hotel_id = h.id and r.realizada_em is not null) as realizadas,
      exists (select 1 from impl_reunioes r where r.hotel_id = h.id and r.agendada_para is not null and r.realizada_em is null) as reuniao_pendente,
      (select min(u.convidado_em) from impl_usuarios u where u.hotel_id = h.id and u.perfil = 'cliente') as primeiro_convite,
      greatest(
        (select max(p.em) from impl_passos_feitos p where p.hotel_id = h.id),
        (select max(greatest(r.agendada_em, r.realizada_em)) from impl_reunioes r where r.hotel_id = h.id)
      ) as avancou_em,
      (select max(a.last_sign_in_at) from impl_usuarios u join auth.users a on lower(a.email) = u.email
        where u.hotel_id = h.id and u.perfil = 'cliente') as entrou_em
    from impl_hoteis h, cfg
    where cfg.ativo and not h.teste and h.sensedata_id is not null and h.cs_email is not null
      and (jsonb_array_length(cfg.somente) = 0 or cfg.somente ? h.id::text)
  ),
  calc as (
    select b.*,
      greatest(b.primeiro_convite, b.avancou_em) as ultimo_avanco,
      greatest(b.primeiro_convite, b.entrou_em) as ultimo_acesso
    from base b
    where b.primeiro_convite is not null and not b.reuniao_pendente and b.blocos > 0 and b.realizadas < b.blocos
  ),
  parados as (
    select c.*, array_remove(array[
        case when c.ultimo_avanco < now() - make_interval(days => cfg.dias)
              and not exists (select 1 from impl_alertas_parado a where a.hotel_id = c.id and a.ok
                                and 'sem_avancar' = any(a.motivos) and a.ref_avanco = c.ultimo_avanco)
             then 'sem_avancar' end,
        case when c.ultimo_acesso < now() - make_interval(days => cfg.dias)
              and not exists (select 1 from impl_alertas_parado a where a.hotel_id = c.id and a.ok
                                and 'sem_entrar' = any(a.motivos) and a.ref_acesso = c.ultimo_acesso)
             then 'sem_entrar' end
      ], null) as motivos
    from calc c, cfg
  )
  select id, nome, sensedata_id, cs_email, cs_nome, ultimo_avanco, ultimo_acesso, motivos
  from parados where cardinality(motivos) > 0;
$$;
revoke execute on function public.impl_hoteis_parados() from public, anon, authenticated;
grant execute on function public.impl_hoteis_parados() to service_role;

-- Verificação diária (dias úteis, 9h de Brasília = 12h UTC).
select cron.schedule('impl-alerta-parados-diario', '0 12 * * 1-5', $c$
  select net.http_post(
    url := 'https://bapvpfbvwktwbnymwrje.supabase.co/functions/v1/impl-sync-sensedata',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-sync-chave', (select valor from public.impl_segredos where chave = 'sync_chave')),
    body := '{"modo": "parados"}'::jsonb,
    timeout_milliseconds := 120000
  );
$c$);
