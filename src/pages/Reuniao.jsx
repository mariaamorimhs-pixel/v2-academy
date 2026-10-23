import { useEffect, useState } from 'react'
import { dadosDoHotel, fmtDataHora, nomeReuniao, listaMarcas, tentar, useSomenteLeitura, AVISO_LEITURA } from '../comum.jsx'
import { nomeProduto } from '../trilhas.js'
import { agendarReuniao } from '../dados.js'
import { Voltar } from './Produto.jsx'

// Agendamento da reunião do fim do módulo pelo Calendly do analista do hotel.
// O próximo bloco só abre quando o analista marca "Reunião realizada".
export default function Reuniao({ estado, hotelId, numero }) {
  const { jornada, progresso, prog, analista } = dadosDoHotel(estado, hotelId)
  const seg = jornada.find((s) => s.tipo === 'reuniao' && s.numero === numero)
  const [reagendar, setReagendar] = useState(false)
  const leitura = useSomenteLeitura()

  // O Calendly avisa a página quando a pessoa conclui o agendamento no widget embutido.
  useEffect(() => {
    const aoReceber = (e) => {
      if (leitura) return
      if (e.origin === 'https://calendly.com' && e.data?.event === 'calendly.event_scheduled') {
        tentar(() => agendarReuniao(hotelId, numero, null)).then((ok) => ok && setReagendar(false))
      }
    }
    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [hotelId, numero, leitura])

  if (!seg) return <Voltar texto="Reunião não encontrada." />
  const st = prog.status[seg.id]
  if (st === 'bloqueado') return <Voltar texto={`A ${nomeReuniao(seg).replace(/^R/, 'r')} abre quando você concluir a trilha do ${listaMarcas(seg.produtos)}.`} />
  const r = progresso.reunioes?.[numero] ?? {}

  return (
    <>
      <a href="#/implantacao" className="voltar">← Minha implantação</a>
      <header className="cabecalho">
        <div>
          <h1>{nomeReuniao(seg, analista)}</h1>
          <p className="muted">Vamos revisar juntos o que você configurou no {listaMarcas(seg.produtos)} e tirar suas dúvidas.</p>
        </div>
      </header>

      {st === 'concluido' ? (
        <div className="cartao">
          <p className="ok-texto">Reunião realizada em {fmtDataHora(r.realizadaEm)}</p>
          <a className="btn primario" href="#/implantacao">Ver o próximo módulo</a>
        </div>
      ) : r.agendadaEm && !reagendar ? (
        <div className="cartao">
          <h2>{r.agendadaPara ? `Marcada para ${fmtDataHora(r.agendadaPara)}` : 'Reunião marcada pelo Calendly'}</h2>
          <p className="muted">Você recebe o convite por e-mail. Assim que {analista?.nome.split(' ')[0] ?? 'o analista'} confirmar que a reunião aconteceu, o próximo módulo é liberado.</p>
          <button className="btn fantasma" onClick={() => setReagendar(true)} disabled={leitura} title={leitura ? AVISO_LEITURA : undefined}>Reagendar</button>
        </div>
      ) : leitura ? (
        <div className="cartao">
          <h2>Escolha um horário</h2>
          <p className="muted">Aqui o cliente vê a agenda {analista?.calendly ? 'do Calendly ' : ''}de {analista?.nome ?? 'seu analista'} para marcar a reunião.</p>
          <p className="aviso-leitura pequeno">{AVISO_LEITURA}</p>
        </div>
      ) : (
        <Agendar analista={analista} onAgendar={async (quando) => { if (await tentar(() => agendarReuniao(hotelId, numero, quando))) setReagendar(false) }} />
      )}
    </>
  )
}

function Agendar({ analista, onAgendar }) {
  const [quando, setQuando] = useState('')
  if (analista?.calendly) {
    const url = `${analista.calendly}${analista.calendly.includes('?') ? '&' : '?'}embed_type=Inline&hide_gdpr_banner=1&embed_domain=${window.location.hostname}`
    return (
      <div className="cartao calendly">
        <iframe src={url} title="Agenda do analista" />
      </div>
    )
  }
  // Demonstração: ainda não temos os links do Calendly dos analistas.
  return (
    <div className="cartao">
      <h2>Escolha um horário</h2>
      <p className="muted pequeno">A agenda online do seu analista ainda não foi configurada. Escolha uma data e hora e ele confirma com você.</p>
      <div className="linha-form">
        <label>Data e hora<input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} /></label>
        <button className="btn primario" disabled={!quando} onClick={() => onAgendar(new Date(quando).toISOString())}>Confirmar agendamento</button>
      </div>
    </div>
  )
}
