-- Logo próprio por pesquisa: o admin envia a imagem pelo editor (bucket público "pesquisas" do Storage).
-- Sem logo enviado, a página pública mostra o logo do HSystem Academy.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pesquisas', 'pesquisas', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

-- Só o admin envia, troca ou apaga arquivos; a leitura é pública (bucket público).
create policy impl_pesquisas_logo_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'pesquisas' and (public.impl_eu()).perfil = 'admin');
create policy impl_pesquisas_logo_trocar on storage.objects for update to authenticated
  using (bucket_id = 'pesquisas' and (public.impl_eu()).perfil = 'admin');
create policy impl_pesquisas_logo_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'pesquisas' and (public.impl_eu()).perfil = 'admin');

alter table public.impl_pesquisas add column if not exists logo_url text check (logo_url is null or logo_url ~ '^https://');

create or replace function public.impl_pesquisa_publica(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('titulo', titulo, 'descricao', descricao, 'perguntas', perguntas,
                            'texto_botao', texto_botao, 'redirecionar_url', redirecionar_url, 'logo_url', logo_url)
  from impl_pesquisas where slug = lower(p_slug) and ativa;
$$;

-- impl_salvar_pesquisa ganha o logo (p_logo_url; nulo = logo padrão)
drop function public.impl_salvar_pesquisa(uuid, text, text, text, jsonb, text, text, boolean);
create function public.impl_salvar_pesquisa(p_id uuid, p_slug text, p_titulo text, p_descricao text, p_perguntas jsonb,
  p_texto_botao text, p_redirecionar_url text, p_ativa boolean, p_logo_url text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare novo uuid; v_slug text := lower(trim(p_slug));
begin
  perform public.impl_exigir((public.impl_eu()).perfil = 'admin');
  if coalesce(trim(p_titulo), '') = '' then raise exception 'Informe o título da pesquisa.'; end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'O endereço da pesquisa só pode ter letras sem acento, números e hífens.'; end if;
  if exists (select 1 from impl_pesquisas where slug = v_slug and id is distinct from p_id) then raise exception 'Já existe uma pesquisa com o endereço %.', v_slug; end if;
  if nullif(trim(p_redirecionar_url), '') !~ '^https?://' then raise exception 'O endereço de redirecionamento precisa começar com https://'; end if;
  if nullif(trim(p_logo_url), '') !~ '^https://' then raise exception 'Logo inválido.'; end if;
  if jsonb_typeof(p_perguntas) <> 'array' then raise exception 'Perguntas inválidas.'; end if;

  if p_id is null then
    insert into impl_pesquisas (slug, titulo, descricao, perguntas, texto_botao, redirecionar_url, ativa, logo_url)
    values (v_slug, trim(p_titulo), nullif(trim(p_descricao), ''), p_perguntas, coalesce(nullif(trim(p_texto_botao), ''), 'Enviar respostas'),
            nullif(trim(p_redirecionar_url), ''), coalesce(p_ativa, true), nullif(trim(p_logo_url), ''))
    returning id into novo;
    return novo;
  end if;
  update impl_pesquisas set slug = v_slug, titulo = trim(p_titulo), descricao = nullif(trim(p_descricao), ''), perguntas = p_perguntas,
    texto_botao = coalesce(nullif(trim(p_texto_botao), ''), 'Enviar respostas'), redirecionar_url = nullif(trim(p_redirecionar_url), ''),
    ativa = coalesce(p_ativa, true), logo_url = nullif(trim(p_logo_url), ''), atualizado_em = now()
  where id = p_id;
  return p_id;
end $$;
revoke execute on function public.impl_salvar_pesquisa(uuid, text, text, text, jsonb, text, text, boolean, text) from public, anon;
grant execute on function public.impl_salvar_pesquisa(uuid, text, text, text, jsonb, text, text, boolean, text) to authenticated;
