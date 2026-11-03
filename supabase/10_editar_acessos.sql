-- Tela Acessos (só admin): editar nome, e-mail, perfil, hotel e Calendly de qualquer acesso, e remover acessos.
-- Regras: ninguém tira o próprio perfil de admin nem remove o próprio acesso (para não ficar trancado fora).

create or replace function public.impl_atualizar_acesso(p_id uuid, p_nome text, p_email text, p_perfil text,
  p_hotel uuid default null, p_calendly text default null)
returns void language plpgsql security definer set search_path = public as $$
declare eu impl_usuarios := public.impl_eu(); antes impl_usuarios; v_email text := lower(trim(p_email));
begin
  perform public.impl_exigir(eu.perfil = 'admin');
  select * into antes from impl_usuarios where id = p_id;
  if not found then raise exception 'Acesso não encontrado.'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o nome.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;
  if p_perfil not in ('admin', 'analista', 'cliente') then raise exception 'Perfil inválido.'; end if;
  if p_perfil = 'cliente' and not exists (select 1 from impl_hoteis where id = p_hotel) then raise exception 'Escolha o hotel do usuário.'; end if;
  if exists (select 1 from impl_usuarios where email = v_email and id <> p_id) then raise exception 'Já existe um acesso com o e-mail %.', v_email; end if;
  if p_id = eu.id and p_perfil <> 'admin' then raise exception 'Você não pode tirar o seu próprio perfil de admin.'; end if;
  if p_perfil = 'analista' and nullif(trim(p_calendly), '') !~ '^https://calendly\.com/' then
    raise exception 'O link do Calendly precisa começar com https://calendly.com/';
  end if;

  update impl_usuarios set
    nome = trim(p_nome), email = v_email, perfil = p_perfil,
    hotel_id = case when p_perfil = 'cliente' then p_hotel end,
    calendly = case when p_perfil = 'analista' then nullif(trim(p_calendly), '') end
  where id = p_id;

  -- deixou de ser analista: os hotéis dele ficam sem analista; virou analista: assume os hotéis em que é o CS
  if antes.perfil = 'analista' and p_perfil <> 'analista' then
    update impl_hoteis set analista_id = null where analista_id = p_id;
  end if;
  if p_perfil = 'analista' then
    update impl_hoteis set analista_id = p_id where cs_email = v_email and analista_id is null;
  end if;
end $$;

-- Remove o acesso. O progresso dos hotéis fica (quem concluiu um passo continua registrado pelo nome).
create or replace function public.impl_remover_acesso(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'admin');
  if p_id = (public.impl_eu()).id then raise exception 'Você não pode remover o seu próprio acesso.'; end if;
  delete from impl_usuarios where id = p_id;
end $$;

revoke execute on function public.impl_atualizar_acesso(uuid, text, text, text, uuid, text), public.impl_remover_acesso(uuid) from public, anon;
grant execute on function public.impl_atualizar_acesso(uuid, text, text, text, uuid, text), public.impl_remover_acesso(uuid) to authenticated;

-- criar acesso também aceita o Calendly do analista
drop function public.impl_criar_acesso(text, text, text, uuid);
create function public.impl_criar_acesso(p_nome text, p_email text, p_perfil text, p_hotel uuid default null, p_calendly text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare novo uuid; v_email text := lower(trim(p_email));
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'admin');
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o nome.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;
  if p_perfil not in ('admin', 'analista', 'cliente') then raise exception 'Perfil inválido.'; end if;
  if p_perfil = 'cliente' and not exists (select 1 from impl_hoteis where id = p_hotel) then raise exception 'Escolha o hotel do usuário.'; end if;
  if exists (select 1 from impl_usuarios where email = v_email) then raise exception 'Já existe um acesso com o e-mail %.', v_email; end if;
  if p_perfil = 'analista' and nullif(trim(p_calendly), '') !~ '^https://calendly\.com/' then
    raise exception 'O link do Calendly precisa começar com https://calendly.com/';
  end if;

  insert into impl_usuarios (nome, email, perfil, hotel_id, calendly)
  values (trim(p_nome), v_email, p_perfil, case when p_perfil = 'cliente' then p_hotel end,
          case when p_perfil = 'analista' then nullif(trim(p_calendly), '') end)
  returning id into novo;
  if p_perfil = 'analista' then
    update impl_hoteis set analista_id = novo where cs_email = v_email and analista_id is null;
  end if;
  return novo;
end $$;
revoke execute on function public.impl_criar_acesso(text, text, text, uuid, text) from public, anon;
grant execute on function public.impl_criar_acesso(text, text, text, uuid, text) to authenticated;
