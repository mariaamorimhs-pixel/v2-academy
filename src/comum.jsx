// Peças usadas em várias telas: datas, vídeo do YouTube, texto, barra de progresso e ícones de status.
import { montarJornada, calcularProgresso } from './regras.js'

// Executa uma ação no banco e avisa se der erro (sem rede, sem permissão…). Devolve true se deu certo.
export async function tentar(fn) {
  try {
    await fn()
    return true
  } catch (e) {
    alert(`Não foi possível concluir: ${e.message}`)
    return false
  }
}

export const fmtData =(iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')
export const fmtDataHora = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
export const diasDesde = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)) : null)

// Jornada + progresso de um hotel, com o conteúdo editado pela editora já aplicado.
export function dadosDoHotel(estado, hotelId) {
  const hotel = estado.hoteis.find((h) => h.id === hotelId)
  if (!hotel) return null
  const progresso = estado.progresso[hotelId] ?? { passos: {}, reunioes: {} }
  const jornada = montarJornada(hotel.contratos, estado.conteudo)
  const prog = calcularProgresso(jornada, progresso)
  const analista = estado.usuarios.find((u) => u.id === hotel.analistaId)
  return { hotel, progresso, jornada, prog, analista }
}

// Aceita youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID ou o próprio ID.
export function youtubeId(url) {
  if (!url) return null
  const s = url.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  const m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/)
  return m ? m[1] : null
}

export function Video({ url, titulo }) {
  const id = youtubeId(url)
  if (!id) return <div className="video vazio"><span>Vídeo em produção</span></div>
  return (
    <div className="video">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
        title={titulo}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  )
}

// Texto simples: linha em branco separa parágrafos; linhas começando com "- " viram lista.
export function Texto({ texto }) {
  if (!texto?.trim()) return <p className="muted">Texto em produção.</p>
  return (
    <div className="texto">
      {texto.trim().split(/\n\s*\n/).map((bloco, i) => {
        const linhas = bloco.split('\n')
        if (linhas.every((l) => l.trim().startsWith('- '))) {
          return <ul key={i}>{linhas.map((l, j) => <li key={j}>{l.trim().slice(2)}</li>)}</ul>
        }
        return <p key={i}>{linhas.map((l, j) => <span key={j}>{j > 0 && <br />}{l}</span>)}</p>
      })}
    </div>
  )
}

export function Barra({ pct, fina }) {
  return (
    <div className={`barra ${fina ? 'fina' : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

// Círculo de status: check (concluído), anel cheio (atual), cadeado (bloqueado).
export function Marca({ status }) {
  if (status === 'concluido') {
    return (
      <span className="marca concluido" aria-label="Concluído">
        <svg viewBox="0 0 16 16" width="12" height="12"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    )
  }
  if (status === 'bloqueado') {
    return (
      <span className="marca bloqueado" aria-label="Bloqueado">
        <svg viewBox="0 0 16 16" width="11" height="11"><rect x="3.5" y="7" width="9" height="7" rx="1.5" fill="currentColor" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </span>
    )
  }
  return <span className={`marca ${status}`} aria-label={status === 'atual' ? 'Liberado' : 'Em preparação'} />
}

const ROTULOS = { concluido: 'Concluído', atual: 'Em andamento', bloqueado: 'Bloqueado', preparacao: 'Em preparação' }
export const Selo = ({ status, children }) => <span className={`selo ${status}`}>{children ?? ROTULOS[status]}</span>

export const nomeReuniao = (seg) => `Reunião ${seg.numero}`
export const assuntoReuniao = (seg, nome) => seg.produtos.map(nome).join(', ')
