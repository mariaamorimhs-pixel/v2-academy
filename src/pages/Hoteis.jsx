import { dadosDoHotel, Barra, fmtDataHora, diasDesde, nomeReuniao } from '../comum.jsx'
import { nomeProduto, corProduto } from '../trilhas.js'
import PainelSensedata from './Sensedata.jsx'

// Onde cada hotel está: produto atual, % concluído, situação da reunião e há quantos dias está parado.
export function situacaoDoHotel(d) {
  const { prog, progresso } = d
  const a = prog.atual
  const dias = diasDesde(progresso.ultimaAtividade)
  let etapa, reuniao = null, cor = null
  if (!a) etapa = 'Implantação concluída'
  else if (a.tipo === 'passo') { etapa = nomeProduto(a.produto); cor = corProduto(a.produto) }
  else {
    etapa = nomeReuniao(a.reuniao)
    const r = progresso.reunioes?.[a.numero] ?? {}
    reuniao = r.agendadaEm
      ? { tipo: 'agendada', texto: r.agendadaPara ? `Agendada ${fmtDataHora(r.agendadaPara)}` : 'Agendada (Calendly)' }
      : { tipo: 'pendente', texto: 'Aguardando agendamento' }
  }
  return { etapa, reuniao, dias, cor }
}

export default function Hoteis({ estado, usuario, todos }) {
  const linhas = estado.hoteis
    .filter((h) => todos || h.analistaId === usuario.id)
    .map((h) => {
      const d = dadosDoHotel(estado, h.id)
      return { ...d, ...situacaoDoHotel(d) }
    })
    .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0))

  const aguardandoConfirmacao = linhas.filter((l) => l.reuniao?.tipo === 'agendada').length

  return (
    <>
      <header className="cabecalho">
        <div>
          <h1>{todos ? 'Hotéis em implantação' : 'Meus hotéis'}</h1>
          <p className="muted">
            {linhas.length} {linhas.length === 1 ? 'hotel' : 'hotéis'}
            {aguardandoConfirmacao > 0 && <> · {aguardandoConfirmacao} com reunião agendada para você confirmar depois de realizada</>}
          </p>
        </div>
      </header>

      {todos && <PainelSensedata estado={estado} />}

      <div className="cartao tabela-cartao">
        <table className="tabela">
          <thead>
            <tr>
              <th>Hotel</th>
              {todos && <th>Analista</th>}
              <th>Etapa atual</th>
              <th>Concluído</th>
              <th>Reunião</th>
              <th className="num">Dias parado</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.hotel.id} onClick={() => { window.location.hash = `/hotel/${l.hotel.id}` }}>
                <td><a href={`#/hotel/${l.hotel.id}`}><b>{l.hotel.nome}</b></a><br /><span className="muted pequeno">{l.hotel.cidade}</span></td>
                {todos && <td>{l.analista?.nome ?? (l.hotel.csEmail ? <span className="selo alerta" title={l.hotel.csEmail}>⚠ {l.hotel.csNome || l.hotel.csEmail} (não cadastrado)</span> : <span className="muted">—</span>)}</td>}
                <td>{l.cor ? <span className="produto-rotulo" style={{ '--cor': l.cor }}>{l.etapa}</span> : l.etapa}</td>
                <td className="col-pct"><Barra pct={l.prog.pct} fina /><span className="pequeno">{l.prog.pct}%</span></td>
                <td>{l.reuniao ? <span className={`selo ${l.reuniao.tipo === 'agendada' ? 'atual' : 'alerta'}`}>{l.reuniao.texto}</span> : <span className="muted">—</span>}</td>
                <td className="num"><span className={l.dias >= 7 ? 'selo critico' : l.dias >= 3 ? 'selo alerta' : ''}>{l.dias ?? '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
