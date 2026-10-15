-- Dados de teste: editora, dois analistas de teste e três hotéis de teste (marcados teste = true).
-- Rodar depois do 01_estrutura.sql. Troque o e-mail da editora se for outro login.

do $$
declare ana uuid; bruno uuid; mar uuid; serra uuid; centro uuid;
begin
  insert into impl_usuarios (email, nome, perfil) values ('maria.amorim@hsystem.com.br', 'Maria Amorim', 'editora');
  insert into impl_usuarios (email, nome, perfil) values ('ana.teste@exemplo.com', 'Ana Lima (teste)', 'analista') returning id into ana;
  insert into impl_usuarios (email, nome, perfil) values ('bruno.teste@exemplo.com', 'Bruno Costa (teste)', 'analista') returning id into bruno;

  insert into impl_hoteis (nome, cidade, analista_id, status_sense, teste, ultima_atividade) values ('Pousada Mar Azul (teste)', 'Ubatuba, SP', ana, 'Onboarding', true, now() - interval '2 days') returning id into mar;
  insert into impl_hoteis (nome, cidade, analista_id, status_sense, teste, ultima_atividade) values ('Hotel Serra Verde (teste)', 'Gramado, RS', bruno, 'Onboarding', true, now() - interval '1 day') returning id into serra;
  insert into impl_hoteis (nome, cidade, analista_id, status_sense, teste, ultima_atividade) values ('Hotel Centro Executivo (teste)', 'Belo Horizonte, MG', ana, 'Onboarding', true, now() - interval '9 days') returning id into centro;

  insert into impl_usuarios (email, nome, perfil, hotel_id) values
    ('carla@pousadamarazul.exemplo', 'Carla Mendes', 'cliente', mar),
    ('joao@pousadamarazul.exemplo', 'João Prado', 'cliente', mar),
    ('fernanda@serraverde.exemplo', 'Fernanda Rocha', 'cliente', serra),
    ('rafael@centroexecutivo.exemplo', 'Rafael Nunes', 'cliente', centro);

  insert into impl_contratos (hotel_id, plano, fim) values
    (mar, 'HBOOK', null), (mar, 'HBOOK-METASEARCHES', null), (mar, 'HBOT', null),
    (serra, 'HBOOK', null), (serra, 'HUNIT', null), (serra, 'HCONNECT-HUNIT', null), (serra, 'HPAY-HUNIT', null), (serra, 'HPRICE', null),
    (centro, 'HUNIT', null), (centro, 'HCORP', null), (centro, 'HBOT', null), (centro, 'HPRICE', '2026-09-30'), (centro, 'HWEB', null);

  insert into impl_passos_feitos (hotel_id, passo_id, por_nome, em) values
    (mar, 'hbook-1-1', 'Carla Mendes', now() - interval '6 days'),
    (mar, 'hbook-2-1', 'Carla Mendes', now() - interval '5 days'),
    (mar, 'hbook-2-2', 'João Prado', now() - interval '3 days'),
    (mar, 'hbook-2-3', 'João Prado', now() - interval '2 days');
  insert into impl_passos_feitos (hotel_id, passo_id, por_nome, em)
    select serra, p, 'Fernanda Rocha', now() - interval '1 day' from unnest(array[
      'hbook-1-1','hbook-2-1','hbook-2-2','hbook-2-3','hbook-2-4','hbook-2-5','hbook-4-1','hbook-5-1','hbook-5-2','hbook-5-3','hbook-5-4',
      'hbook-6-1','hbook-6-2','hbook-6-3','hbook-7-1','hbook-8-1',
      'hunit-1-1','hunit-2-1','hunit-2-2','hunit-3-1','hunit-3-2','hunit-4-1','hunit-4-2','hunit-5-1','hunit-6-1','hunit-7-1']) p;
  insert into impl_reunioes (hotel_id, numero, agendada_para, agendada_em)
    values (serra, 1, date_trunc('day', now()) + interval '3 days 17 hours', now() - interval '1 day');
end $$;
