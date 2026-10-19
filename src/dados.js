// Camada de dados: lê as tabelas impl_* do Supabase (cada um só recebe o que pode ver, pelas regras do banco)
// e monta o mesmo formato que as telas usam. Toda gravação passa pelas funções impl_* do banco,
// que conferem quem está pedindo.
import { useSyncExternalStore } from 'react'
import { supabase } from './supabase.js'

let estado = { carregado: false, usuarios: [], hoteis: [], progresso: {}, conteudo: {}, inscricoes: {} }
const ouvintes = new Set()
const assinar = (f) => { ouvintes.add(f); return () => ouvintes.delete(f) }
export const useEstado = () => useSyncExternalStore(assinar, () => estado)

function publicar(novo) {
  estado = novo
  ouvintes.forEach((f) => f())
}

const semNulos = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== ''))

export async function recarregar() {
  const respostas = await Promise.all([
    supabase.from('impl_usuarios').select('id, email, nome, perfil, hotel_id, calendly, convidado_em'),
    supabase.from('impl_hoteis').select('id, nome, cidade, analista_id, status_sense, teste, ultima_atividade, cs_nome, cs_email, sensedata_id, sincronizado_em'),
    supabase.from('impl_contratos').select('hotel_id, plano, fim'),
    supabase.from('impl_passos_feitos').select('hotel_id, passo_id, por_nome, em'),
    supabase.from('impl_reunioes').select('hotel_id, numero, agendada_para, agendada_em, realizada_em, realizada_por'),
    supabase.from('impl_conteudo').select('passo_id, titulo, video, texto'),
    supabase.from('impl_inscricoes').select('hotel_id, treino_id, por_nome, em'),
    // integração com o Sensedata: só a editora recebe linhas (regras do banco)
    supabase.from('impl_config').select('chave, valor'),
    supabase.from('impl_sync_log').select('id, origem, iniciado_em, terminado_em, ok, resumo, erro').order('id', { ascending: false }).limit(5),
  ])
  const erro = respostas.find((r) => r.error)?.error
  if (erro) throw new Error(erro.message)
  const [usuarios, hoteis, contratos, passos, reunioes, conteudo, inscricoes, config, syncLog] = respostas.map((r) => r.data)

  const progresso = {}
  for (const h of hoteis) progresso[h.id] = { passos: {}, reunioes: {}, ultimaAtividade: h.ultima_atividade }
  for (const p of passos) progresso[p.hotel_id].passos[p.passo_id] = { por: p.por_nome, em: p.em }
  for (const r of reunioes) {
    progresso[r.hotel_id].reunioes[r.numero] = {
      agendadaPara: r.agendada_para, agendadaEm: r.agendada_em, realizadaEm: r.realizada_em, realizadaPor: r.realizada_por,
    }
  }

  publicar({
    carregado: true,
    usuarios: usuarios.map((u) => ({
      id: u.id, email: u.email, nome: u.nome, perfil: u.perfil, hotelId: u.hotel_id, calendly: u.calendly ?? '', convidadoEm: u.convidado_em,
    })),
    hoteis: hoteis
      .map((h) => ({
        id: h.id, nome: h.nome, cidade: h.cidade, analistaId: h.analista_id, statusSense: h.status_sense, teste: h.teste,
        csNome: h.cs_nome, csEmail: h.cs_email, sensedataId: h.sensedata_id, sincronizadoEm: h.sincronizado_em,
        contratos: contratos.filter((c) => c.hotel_id === h.id).map((c) => ({ plano: c.plano, fim: c.fim })),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    progresso,
    conteudo: Object.fromEntries(conteudo.map((c) => [c.passo_id, semNulos({ titulo: c.titulo, video: c.video, texto: c.texto })])),
    inscricoes: inscricoes.reduce((acc, i) => { (acc[i.hotel_id] ??= {})[i.treino_id] = { por: i.por_nome, em: i.em }; return acc }, {}),
    integracao: {
      historico: syncLog,
    },
  })
}

export function limparDados() {
  publicar({ carregado: false, usuarios: [], hoteis: [], progresso: {}, conteudo: {}, inscricoes: {} })
}

async function acao(nome, args) {
  const { error } = await supabase.rpc(nome, args)
  if (error) throw new Error(error.message)
  await recarregar()
}

// ---- ações ----

export const concluirPasso = (hotelId, passoId) => acao('impl_concluir_passo', { p_hotel: hotelId, p_passo: passoId })

// `quando` = data/hora escolhida; null quando veio do Calendly sem horário conhecido.
export const agendarReuniao = (hotelId, numero, quando) =>
  acao('impl_agendar_reuniao', { p_hotel: hotelId, p_numero: numero, p_quando: quando })

export const marcarReuniaoRealizada = (hotelId, numero) => acao('impl_reuniao_realizada', { p_hotel: hotelId, p_numero: numero })

export const salvarConteudo = (passoId, d) =>
  acao('impl_salvar_conteudo', { p_passo: passoId, p_titulo: d.titulo, p_video: d.video, p_texto: d.texto })

export const restaurarConteudo = (passoId) => acao('impl_restaurar_conteudo', { p_passo: passoId })

export const salvarAnalista = (id, nome, email, calendly) =>
  acao('impl_salvar_analista', { p_id: id ?? null, p_nome: nome, p_email: email, p_calendly: calendly })

// Inscrição feita pela janela do Calendly (o Calendly avisa a página quando a pessoa conclui).
export const registrarInscricao = (hotelId, treinoId) => acao('impl_registrar_inscricao', { p_hotel: hotelId, p_treino: treinoId })

// Sincronização com o Sensedata (função impl-sync-sensedata).
export async function sincronizarSensedata() {
  const { data, error } = await supabase.functions.invoke('impl-sync-sensedata', { body: {} })
  let erro = null
  if (error) {
    erro = error.message
    try { erro = (await error.context.json()).erro ?? erro } catch { /* mantém a mensagem padrão */ }
  }
  await recarregar()
  if (erro) throw new Error(erro)
  return data
}

export const zerarHotelTeste = (hotelId) => acao('impl_zerar_hotel_teste', { p_hotel: hotelId })

// Convite de primeiro acesso por e-mail (ou link de definir senha, para quem já tem login).
export async function enviarConvite(usuarioId) {
  const { data, error } = await supabase.functions.invoke('impl-convidar', {
    body: { usuario_id: usuarioId, redirect_to: window.location.origin + window.location.pathname },
  })
  if (error) {
    let msg = error.message
    try { msg = (await error.context.json()).erro ?? msg } catch { /* mantém a mensagem padrão */ }
    throw new Error(msg)
  }
  await recarregar()
  return data
}
