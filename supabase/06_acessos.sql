-- Níveis de acesso: o perfil "editora" passa a se chamar "admin" (acesso a tudo + criar acessos).
-- Perfis: admin, analista (só os hotéis dele) e cliente (o próprio hotel).

-- 1) Troca o valor nos dados e na regra da coluna
alter table public.impl_usuarios drop constraint impl_usuarios_perfil_check;
update public.impl_usuarios set perfil = 'admin' where perfil = 'editora';
alter table public.impl_usuarios add constraint impl_usuarios_perfil_check check (perfil in ('cliente', 'analista', 'admin'));

-- 2) Reescreve as funções e as regras de leitura que comparavam com 'editora'
do $$
declare fn record; pol_r record; usando text; checando text;
begin
  for fn in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.proname like 'impl%' and pg_get_functiondef(p.oid) like '%''editora''%'
  loop
    execute replace(pg_get_functiondef(fn.oid), '''editora''', '''admin''');
  end loop;

  for pol_r in
    select pol.polname, pol.polrelid::regclass as tabela, pol.polcmd, pg_get_expr(pol.polqual, pol.polrelid) as qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) as chk
    from pg_policy pol join pg_class c on c.oid = pol.polrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname like 'impl%'
      and coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') like '%''editora''%'
  loop
    usando := replace(pol_r.qual, '''editora''', '''admin''');
    checando := replace(pol_r.chk, '''editora''', '''admin''');
    execute format('drop policy %I on %s', pol_r.polname, pol_r.tabela);
    execute format('create policy %I on %s for %s to authenticated%s%s',
      replace(pol_r.polname, 'editora', 'admin'), pol_r.tabela,
      case pol_r.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' else 'all' end,
      case when usando is not null then ' using (' || usando || ')' else '' end,
      case when checando is not null then ' with check (' || checando || ')' else '' end);
  end loop;
end $$;

-- 3) Criar acesso (só admin): admin, analista ou usuário de um hotel. Devolve o id para enviar o convite.
create or replace function public.impl_criar_acesso(p_nome text, p_email text, p_perfil text, p_hotel uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare novo uuid; v_email text := lower(trim(p_email));
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'admin');
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o nome.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;
  if p_perfil not in ('admin', 'analista', 'cliente') then raise exception 'Perfil inválido.'; end if;
  if p_perfil = 'cliente' and not exists (select 1 from impl_hoteis where id = p_hotel) then raise exception 'Escolha o hotel do usuário.'; end if;
  if exists (select 1 from impl_usuarios where email = v_email) then raise exception 'Já existe um acesso com o e-mail %.', v_email; end if;

  insert into impl_usuarios (nome, email, perfil, hotel_id)
  values (trim(p_nome), v_email, p_perfil, case when p_perfil = 'cliente' then p_hotel end)
  returning id into novo;
  -- analista novo assume os hotéis em que ele já é o CS no Sensedata
  if p_perfil = 'analista' then
    update impl_hoteis set analista_id = novo where cs_email = v_email and analista_id is null;
  end if;
  return novo;
end $$;
revoke execute on function public.impl_criar_acesso(text, text, text, uuid) from public, anon;
grant execute on function public.impl_criar_acesso(text, text, text, uuid) to authenticated;
