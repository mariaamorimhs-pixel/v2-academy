// Regras de liberação: contratos do Sensedata → jornada do hotel → o que está concluído,
// o que está liberado agora e o que continua travado.
import { CATALOGO } from './trilhas.js'

// Ordem dos produtos e a reunião que fecha cada bloco.
export const BLOCOS = [
  { numero: 1, produtos: ['HBOOK', 'HUNIT', 'HCORP'] },
  { numero: 2, produtos: ['HBOT'] },
  { numero: 3, produtos: ['HPRICE'] },
]
const PLANOS_DA_ESTEIRA = BLOCOS.flatMap((b) => b.produtos)

const hojeISO = () => new Date().toISOString().slice(0, 10)

// Por que cada contrato entra ou não na esteira (usado na tela do analista).
export function avaliarContrato(c, hoje = hojeISO()) {
  if (!PLANOS_DA_ESTEIRA.includes(c.plano)) return { entra: false, motivo: 'Fora da esteira' }
  if (c.fim && c.fim < hoje) return { entra: false, motivo: 'Contrato encerrado' }
  return { entra: true }
}

// Só vale o nome exato do Plano; contrato com Fim no passado é ignorado.
export function planosAtivos(contratos, hoje = hojeISO()) {
  return new Set(contratos.filter((c) => avaliarContrato(c, hoje).entra).map((c) => c.plano))
}

// Jornada = sequência de segmentos: os produtos contratados de cada bloco, em ordem, e a reunião do bloco.
// Produto não contratado é pulado; bloco sem nenhum produto contratado não tem reunião.
export function montarJornada(contratos, conteudo = {}) {
  const planos = planosAtivos(contratos)
  const jornada = []
  for (const bloco of BLOCOS) {
    const produtos = bloco.produtos.filter((p) => planos.has(p))
    if (!produtos.length) continue
    for (const codigo of produtos) {
      const produto = CATALOGO[codigo]
      const etapas = produto.etapas
        .filter((e) => !(e.somenteSem && planos.has(e.somenteSem)))
        .map((e) => ({ ...e, passos: e.passos.map((p) => ({ ...p, ...conteudo[p.id] })) }))
      jornada.push({ tipo: 'produto', id: codigo, codigo, nome: produto.nome, cor: produto.cor, descricao: produto.descricao, etapas })
    }
    jornada.push({ tipo: 'reuniao', id: `reuniao-${bloco.numero}`, numero: bloco.numero, produtos })
  }
  return jornada
}

// Tudo trava em sequência: cada passo e cada reunião é uma unidade; a primeira não concluída é a atual
// e todas depois dela ficam bloqueadas. Reunião só conta como concluída quando o analista confirma.
export function calcularProgresso(jornada, progresso = {}) {
  const passosFeitos = progresso.passos ?? {}
  const reunioes = progresso.reunioes ?? {}
  const unidades = []
  for (const seg of jornada) {
    if (seg.tipo === 'produto') {
      for (const e of seg.etapas) for (const p of e.passos) {
        unidades.push({ id: p.id, tipo: 'passo', produto: seg.codigo, etapa: e, passo: p, feito: !!passosFeitos[p.id] })
      }
    } else {
      unidades.push({ id: seg.id, tipo: 'reuniao', numero: seg.numero, reuniao: seg, feito: !!reunioes[seg.numero]?.realizadaEm })
    }
  }

  const status = {}
  let atual = null
  for (const u of unidades) {
    if (atual) status[u.id] = 'bloqueado'
    else if (u.feito) status[u.id] = 'concluido'
    else { status[u.id] = 'atual'; atual = u }
  }

  // Status de cada produto: concluído, em andamento, bloqueado ou em preparação (sem passos ainda).
  for (const seg of jornada) {
    if (seg.tipo !== 'produto') continue
    const ids = seg.etapas.flatMap((e) => e.passos.map((p) => p.id))
    if (!ids.length) { status[seg.id] = 'preparacao'; continue }
    const s = ids.map((id) => status[id])
    status[seg.id] = s.every((x) => x === 'concluido') ? 'concluido' : s.some((x) => x !== 'bloqueado') ? 'atual' : 'bloqueado'
  }

  const feitas = unidades.filter((u) => status[u.id] === 'concluido').length
  return {
    unidades,
    status,
    atual,
    feitas,
    total: unidades.length,
    pct: unidades.length ? Math.round((feitas / unidades.length) * 100) : 0,
  }
}

// Unidade seguinte a uma dada (para o botão "Próximo").
export function proximaUnidade(prog, id) {
  const i = prog.unidades.findIndex((u) => u.id === id)
  return i >= 0 ? prog.unidades[i + 1] ?? null : null
}
