-- Integração com o Sensedata (já aplicada no projeto bapvpfbvwktwbnymwrje). Rodar depois do 03_inscricoes.sql.
-- A função impl-sync-sensedata (supabase/functions) faz a sincronização; publicar com verify_jwt desligado.
-- Segredo necessário na função: SENSEDATA_TOKEN (Supabase → Edge Functions → Secrets).
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

alter table public.impl_hoteis
  add column if not exists cnpj text,
  add column if not exists cs_nome text,
  add column if not exists cs_email text,
  add column if not exists sincronizado_em timestamptz;
alter table public.impl_contratos add column if not exists descricao text;

create table public.impl_config (chave text primary key, valor jsonb not null, atualizado_em timestamptz not null default now());
insert into public.impl_config (chave, valor) values ('fases_onboarding', '[]'::jsonb), ('fases_encontradas', '[]'::jsonb);

create table public.impl_sync_log (
  id bigint generated always as identity primary key,
  origem text not null, iniciado_em timestamptz not null default now(), terminado_em timestamptz,
  ok boolean, resumo jsonb, erro text
);

create table public.impl_segredos (chave text primary key, valor text not null);
insert into public.impl_segredos (chave, valor) values ('sync_chave', encode(extensions.gen_random_bytes(24), 'hex'));

alter table public.impl_config enable row level security;
alter table public.impl_sync_log enable row level security;
alter table public.impl_segredos enable row level security;
create policy impl_config_ver on public.impl_config for select to authenticated using ((public.impl_eu()).perfil = 'editora');
create policy impl_sync_log_ver on public.impl_sync_log for select to authenticated using ((public.impl_eu()).perfil = 'editora');
revoke all on public.impl_config, public.impl_sync_log, public.impl_segredos from anon, authenticated;
grant select on public.impl_config, public.impl_sync_log to authenticated;

create function public.impl_salvar_fases(p_fases text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'editora');
  update public.impl_config set valor = to_jsonb(coalesce(p_fases, '{}')), atualizado_em = now() where chave = 'fases_onboarding';
end $$;
revoke execute on function public.impl_salvar_fases(text[]) from public, anon;
grant execute on function public.impl_salvar_fases(text[]) to authenticated;

-- Cadastrar um analista liga a ele os hotéis cujo CS (no Sensedata) tem o mesmo e-mail.
create or replace function public.impl_salvar_analista(p_id uuid, p_nome text, p_email text, p_calendly text) returns uuid
language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'editora');
  if p_id is null then
    insert into public.impl_usuarios (nome, email, perfil, calendly) values (trim(p_nome), lower(trim(p_email)), 'analista', nullif(trim(p_calendly), ''))
    returning id into novo;
  else
    update public.impl_usuarios set nome = trim(p_nome), email = lower(trim(p_email)), calendly = nullif(trim(p_calendly), '')
    where id = p_id and perfil = 'analista';
    novo := p_id;
  end if;
  update public.impl_hoteis set analista_id = novo where cs_email = lower(trim(p_email)) and analista_id is null;
  return novo;
end $$;

-- Sincronização de hora em hora (minuto 7), só depois que a editora escolher as Fases.
-- Troque o endereço do projeto se instalar em outro Supabase.
select cron.schedule('impl-sync-sensedata-hora-em-hora', '7 * * * *', $$
  select net.http_post(
    url := 'https://bapvpfbvwktwbnymwrje.supabase.co/functions/v1/impl-sync-sensedata',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-sync-chave', (select valor from public.impl_segredos where chave = 'sync_chave')),
    body := '{}'::jsonb, timeout_milliseconds := 120000)
  where jsonb_array_length(coalesce((select valor from public.impl_config where chave = 'fases_onboarding'), '[]'::jsonb)) > 0;
$$);
