-- Analista também cria acessos, mas só usuários cliente dos hotéis dele (para quando o contato do Sensedata
-- não chegou certo). Admin continua podendo criar qualquer perfil.
create or replace function public.impl_criar_acesso(p_nome text, p_email text, p_perfil text, p_hotel uuid default null, p_calendly text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare eu impl_usuarios := public.impl_eu(); novo uuid; v_email text := lower(trim(p_email));
begin
  perform public.impl_exigir(eu.perfil = 'admin'
    or (eu.perfil = 'analista' and p_perfil = 'cliente' and exists (select 1 from impl_hoteis where id = p_hotel and analista_id = eu.id)));
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
