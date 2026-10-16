// Peças usadas em várias telas: datas, vídeo do YouTube, texto, barra de progresso e ícones de status.
import { useEffect, useRef, useState } from 'react'
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
  if (!id) return null
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
  if (!texto?.trim()) return null
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

export const saudacao = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

// Progresso geral da implantação: o mesmo componente na Início e em Minha implantação,
// sempre no azul da marca (as cores dos produtos ficam só nas faixas e barras de cada produto).
export function ProgressoImplantacao({ prog }) {
  return (
    <div className="progresso-implantacao">
      <Barra pct={prog.pct} rotulo="Progresso da implantação" />
      <span className="muted pequeno">{prog.feitas} de {prog.total} passos concluídos</span>
    </div>
  )
}

// Texto de um item bloqueado da jornada: o que precisa acontecer antes dele.
export function textoDesbloqueio(jornada, seg) {
  const anterior = jornada[jornada.indexOf(seg) - 1]
  if (!anterior) return 'Bloqueado'
  return anterior.tipo === 'reuniao' ? `Libera após a ${nomeReuniao(anterior)}` : `Libera ao concluir ${anterior.nome}`
}

export function Barra({ pct, fina, rotulo }) {
  return (
    <div className={`barra ${fina ? 'fina' : ''}`} role="progressbar" aria-label={rotulo} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
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
  return <span className={`marca ${status}`} aria-label={status === 'atual' ? 'Liberado' : status === 'embreve' ? 'Em breve' : 'Em preparação'} />
}

const ROTULOS = { concluido: 'Concluído', atual: 'Em andamento', bloqueado: 'Bloqueado', preparacao: 'Em preparação', embreve: 'Em breve' }
export const Selo = ({ status, children }) => <span className={`selo ${status}`}>{children ?? ROTULOS[status]}</span>

export const nomeReuniao = (seg) => `Reunião ${seg.numero}`
export const assuntoReuniao = (seg, nome) => seg.produtos.map(nome).join(', ')

// Agenda da turma do Calendly por cima da tela, sem sair do sistema.
// Acessível: o foco vai para "Fechar" ao abrir, o Tab fica preso dentro da janela e, ao fechar
// (Fechar, Esc ou clique fora), o foco volta ao botão que abriu.
const LIMITE_CARREGAMENTO_MS = 10000

export function JanelaCalendly({ treino, onFechar }) {
  const [estadoAgenda, setEstadoAgenda] = useState('carregando') // carregando | pronta | erro
  const fechar = useRef(null)
  const agenda = useRef(null)
  const quemAbriu = useRef(document.activeElement)
  const aoFechar = useRef(onFechar)
  aoFechar.current = onFechar

  useEffect(() => {
    const origem = quemAbriu.current
    fechar.current?.focus()
    const aoTeclar = (e) => { if (e.key === 'Escape') aoFechar.current() }
    window.addEventListener('keydown', aoTeclar)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = ''
      origem?.focus?.()
    }
  }, [])

  // A agenda está pronta quando o Calendly avisa que mostrou os horários ou 1,5 s depois que a página
  // dele abriu (nem todo navegador repassa o aviso). Se em 10 s nem a página abriu, mostra o erro.
  const paginaAbriu = useRef(false)
  useEffect(() => {
    const aoReceber = (e) => {
      if (e.origin === 'https://calendly.com' && e.data?.event === 'calendly.event_type_viewed') setEstadoAgenda('pronta')
    }
    window.addEventListener('message', aoReceber)
    const t = setTimeout(() => setEstadoAgenda((s) => (s !== 'carregando' ? s : paginaAbriu.current ? 'pronta' : 'erro')), LIMITE_CARREGAMENTO_MS)
    return () => { window.removeEventListener('message', aoReceber); clearTimeout(t) }
  }, [])

  const parametros = new URLSearchParams({
    embed_type: 'Inline', embed_domain: window.location.hostname,
    hide_gdpr_banner: '1', primary_color: '1976d2', hide_event_type_details: '1',
  })
  const url = `${treino.url}?${parametros}`

  // Sentinelas nas pontas da janela mantêm o Tab circulando entre "Fechar" e a agenda.
  const irParaFechar = () => fechar.current?.focus()
  const irParaAgenda = () => (agenda.current ?? fechar.current)?.focus()

  return (
    <div className="janela-fundo" onClick={() => aoFechar.current()}>
      <div className="janela" role="dialog" aria-modal="true" aria-label={`Treinamento em grupo de ${treino.titulo}`} onClick={(e) => e.stopPropagation()}>
        <span tabIndex={0} onFocus={irParaAgenda} aria-hidden="true" />
        <header>
          <b>Treinamento em grupo · {treino.titulo}</b>
          <button ref={fechar} className="btn fantasma pequeno" onClick={() => aoFechar.current()}>Fechar ✕</button>
        </header>
        <div className="janela-corpo">
          {estadoAgenda === 'erro' ? (
            <div className="janela-aviso">
              <p>Não foi possível carregar a agenda.</p>
              <a className="btn" href={treino.url} target="_blank" rel="noopener noreferrer">Abrir agenda em nova aba</a>
            </div>
          ) : (
            <>
              {estadoAgenda === 'carregando' && <div className="janela-aviso" role="status">Carregando horários…</div>}
              <iframe ref={agenda} src={url} title={`Agenda do treinamento de ${treino.titulo}`}
                className={estadoAgenda === 'pronta' ? '' : 'invisivel'} onLoad={() => {
                  paginaAbriu.current = true
                  setTimeout(() => setEstadoAgenda((s) => (s === 'carregando' ? 'pronta' : s)), 1500)
                }} />
            </>
          )}
        </div>
        <span tabIndex={0} onFocus={irParaFechar} aria-hidden="true" />
      </div>
    </div>
  )
}
