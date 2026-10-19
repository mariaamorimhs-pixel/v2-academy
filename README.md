# Implantação Híbrida HSystem (HSystem Academy Clientes)

Cada hotel em onboarding no Sensedata recebe só as trilhas dos produtos contratados
(hbook → hunit → hcorp → hai → hprice), em ordem travada, com uma reunião com o analista no fim de cada bloco.
Escopo completo: documento "Escopo — Implantação Híbrida HSystem" (Claude Docs).

## Onde fica cada parte
- **Banco**: Supabase, projeto `edqboyyzkbiaevptunrz`, tabelas com prefixo `impl_`
  (`impl_hoteis`, `impl_usuarios`, `impl_contratos`, `impl_passos_feitos`, `impl_reunioes`, `impl_conteudo`).
  Leitura protegida por RLS (cliente vê o próprio hotel, analista os seus, admin tudo).
  Gravação só pelas funções `impl_*` (concluir passo, agendar/confirmar reunião, editar conteúdo,
  cadastrar analista, zerar hotel de teste), que conferem o perfil de quem chama.
- **Convites**: edge function `impl-convidar` (só o admin chama). Envia o convite do Supabase,
  ou o link de definir senha para quem já tem login.
- **Tela**: React + Vite em `src/`.
  - `trilhas.js` — catálogo produto → etapas → passos (ids estáveis, ex.: `hbook-2-3`) e cores.
  - `regras.js` — contratos → jornada; travas; progresso.
  - `dados.js` — leitura das tabelas e chamadas das funções.
  - `pages/` — cliente (Jornada, Produto, Passo, Reuniao), analista (Dashboard, Hoteis, Hotel), admin (Editor, Dashboard, Hoteis, Analistas, Acessos).
- Quem pode entrar: e-mails cadastrados em `impl_usuarios`. Os hotéis com `teste = true` são dados de teste.
  O admin pode "Ver como o cliente" de qualquer hotel e zerar o progresso dos hotéis de teste.

## Níveis de acesso (`supabase/06_acessos.sql`)
- **Admin**: acesso a tudo. Na aba **Acessos** cria acessos de admin, analista ou usuário de um hotel
  (função `impl_criar_acesso`) e envia o convite por e-mail.
- **Analista**: Dashboard e "Meus hotéis", só com os hotéis em que ele é o analista (regras do banco).
- **Cliente**: a implantação do próprio hotel.

## Integração com o Sensedata
- Função `impl-sync-sensedata`: só entram clientes com o playbook **Onboarding - Implantação Híbrida** e o campo
  **implantacao_academy** preenchido; eles viram hotéis; contratos (campo
  **Plano** + fim da vigência) definem os produtos; contatos ativos com e-mail viram usuários do hotel; o **CS**
  do cliente vira o analista (se já cadastrado pelo e-mail; senão aparece como pendência em Hotéis e Analistas).
- Roda de hora em hora (pg_cron, depois da primeira sincronização manual que der certo) e pelo botão "Sincronizar agora" (Hotéis, perfil admin). Histórico em `impl_sync_log`.
- Precisa do segredo `SENSEDATA_TOKEN` na função. Não gerar chave nova no Sensedata: ela é única por ambiente
  e uma chave nova derruba as outras integrações que usam a atual.
- Convites continuam pelo botão (não são enviados na sincronização).
- **Clientes parados** (`supabase/05_parados.sql`): todo dia útil às 9h a função (modo `parados`) cria no Sensedata uma
  tarefa para o CS de cada hotel com 7 dias sem avançar ou sem ninguém entrar no Academy (uma tarefa por parada;
  prazo de 2 dias úteis, prioridade Alta). Não entram hotéis sem convite, com reunião agendada ou com a jornada concluída.
  Liga/desliga e modo de teste em `impl_config` → `alertas_parado` (`somente_hoteis` vazio = todos). Histórico em
  `impl_alertas_parado` e no painel de Hotéis.

## Ainda não feito
- A trava da ordem é aplicada na tela; o banco ainda não impede concluir um passo fora de ordem.

## Rodar no computador
```
npm install
npm run dev
```
Abre em http://localhost:5181. Precisa do arquivo `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY`.
