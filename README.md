# Implantação Híbrida HSystem (HSystem Academy Clientes)

Cada hotel em onboarding no Sensedata recebe só as trilhas dos produtos contratados
(hbook → hunit → hcorp → hai → hprice), em ordem travada, com uma reunião com o analista no fim de cada bloco.
Escopo completo: documento "Escopo — Implantação Híbrida HSystem" (Claude Docs).

## Onde fica cada parte
- **Banco**: Supabase, projeto `edqboyyzkbiaevptunrz`, tabelas com prefixo `impl_`
  (`impl_hoteis`, `impl_usuarios`, `impl_contratos`, `impl_passos_feitos`, `impl_reunioes`, `impl_conteudo`).
  Leitura protegida por RLS (cliente vê o próprio hotel, analista os seus, editora tudo).
  Gravação só pelas funções `impl_*` (concluir passo, agendar/confirmar reunião, editar conteúdo,
  cadastrar analista, zerar hotel de teste), que conferem o perfil de quem chama.
- **Convites**: edge function `impl-convidar` (só a editora chama). Envia o convite do Supabase,
  ou o link de definir senha para quem já tem login.
- **Tela**: React + Vite em `src/`.
  - `trilhas.js` — catálogo produto → etapas → passos (ids estáveis, ex.: `hbook-2-3`) e cores.
  - `regras.js` — contratos → jornada; travas; progresso.
  - `dados.js` — leitura das tabelas e chamadas das funções.
  - `pages/` — cliente (Jornada, Produto, Passo, Reuniao), analista (Hoteis, Hotel), editora (Editor, Analistas).
- Quem pode entrar: e-mails cadastrados em `impl_usuarios`. Os hotéis com `teste = true` são dados de teste.
  A editora pode "Ver como o cliente" de qualquer hotel e zerar o progresso dos hotéis de teste.

## Ainda não feito
- Sincronização com o Sensedata (hotéis, contratos, contatos). Hoje os hotéis são de teste.
- A trava da ordem é aplicada na tela; o banco ainda não impede concluir um passo fora de ordem.

## Rodar no computador
```
npm install
npm run dev
```
Abre em http://localhost:5181. Precisa do arquivo `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY`.
