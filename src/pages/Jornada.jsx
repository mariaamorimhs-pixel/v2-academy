import { dadosDoHotel, Barra, Marca, fmtData, fmtDataHora, textoDesbloqueio, nomeReuniao, listaMarcas } from '../comum.jsx'
import { CATALOGO } from '../trilhas.js'

// Minha implantação: título com o contexto da fase, barra "Sua jornada" com o total da implantação e o
// passo a passo em cards alternados (módulos e reuniões de revisão) ligados por uma linha tracejada,
// terminando no card "Final da implantação". O item atual ganha destaque e o botão da ação.

export default function Jornada({ estado, hotelId }) {
  const d = dadosDoHotel(estado, hotelId)
  if (!d) return <p>Hotel não encontrado.</p>
  const { progresso, jornada, prog, analista } = d
  const a = prog.atual

  // Fases = blocos que terminam numa reunião de revisão.
  const reunioes = jornada.filter((s) => s.tipo === 'reuniao')
  const faseAtual = !a ? reunioes.length
    : a.tipo === 'reuniao' ? reunioes.indexOf(a.reuniao) + 1
    : reunioes.findIndex((r) => r.produtos.includes(a.produto)) + 1
  const produtosDaFase = !a ? [] : a.tipo === 'reuniao' ? a.reuniao.produtos : [a.produto]
  const contexto = !a ? 'Implantação concluída. Os treinamentos continuam disponíveis para consulta.'
    : `Fase ${faseAtual} de ${reunioes.length}: ${listaMarcas(produtosDaFase)}${analista?.nome ? `, com sua analista ${analista.nome}` : ''}`

  return (
    <>
      <header className="jornada-cabecalho">
        <h1>Minha implantação</h1>
        <p className="muted">{contexto}</p>
      </header>

      <div className="sua-jornada">
        <span className="sua-jornada-rotulo">Sua jornada</span>
        <Barra pct={prog.pct} rotulo="Progresso da implantação" />
        <span className="sua-jornada-fase">Implantação: {prog.pct}%</span>
        <span className="sua-jornada-resumo">{prog.feitas} de {prog.total} passos concluídos</span>
      </div>

      <h2 className="secao-titulo passo-a-passo-titulo">Passo a passo</h2>
      <ol className="passo-a-passo">
        {jornada.map((seg) => (seg.tipo === 'produto'
          ? <CardModulo key={seg.id} seg={seg} prog={prog} jornada={jornada} />
          : <CardReuniao key={seg.id} seg={seg} prog={prog} jornada={jornada} analista={analista} r={progresso.reunioes?.[seg.numero] ?? {}} />))}
        <li className={`etapa-jornada final ${a ? 'bloqueado' : 'concluido'}`}>
          <div className="cartao-jornada">
            <div className="cartao-jornada-topo">
              <span className="icone-final" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 21l3.5-10.5L16 18z M8.5 10.5l7.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M14 3v2M19 6l-1.5 1.5M21 11h-2M11 6.5l.5-2M17.5 12.5l2 .5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              </span>
              <div>
                <p className="cartao-jornada-tipo">Implantação</p>
                <h3>Final da implantação</h3>
              </div>
            </div>
            <p className="cartao-jornada-texto">
              {a ? 'Conclua todos os módulos e reuniões de revisão para finalizar a sua implantação.'
                : 'Parabéns! Todos os módulos e reuniões de revisão foram concluídos. Sua implantação está completa.'}
            </p>
          </div>
        </li>
      </ol>
    </>
  )
}

// Ícone do módulo em andamento: anel parcial com o percentual (diferente de concluído, bloqueado e futuro).
function AnelProgresso({ pct }) {
  const r = 20, volta = 2 * Math.PI * r
  return (
    <span className="anel-progresso" aria-label={`${pct}% concluído`}>
      <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" className="anel-fundo" />
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="4" className="anel-valor" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * volta} ${volta}`} transform="rotate(-90 24 24)" />
      </svg>
      <span aria-hidden="true">{pct}%</span>
    </span>
  )
}

// Card de um item do passo a passo. O título é o link (a área clicável cobre o card todo) e o botão
// de ação aparece só no item atual.
function CardJornada({ st, cor, href, tipo, titulo, texto, icone, rodape, acao }) {
  const aberto = href && st !== 'bloqueado'
  return (
    <li className={`etapa-jornada ${st} ${aberto ? 'clicavel' : ''}`} style={{ '--cor': cor }}>
      <div className="cartao-jornada">
        <div className="cartao-jornada-topo">
          {icone ?? <Marca status={st} />}
          <div>
            <p className="cartao-jornada-tipo">{tipo}</p>
            <h3>{aberto ? <a href={href} className="link-cartao">{titulo}</a> : titulo}</h3>
          </div>
        </div>
        <p className="cartao-jornada-texto">{texto}</p>
        <div className="cartao-jornada-rodape">
          {rodape}
          {acao}
        </div>
      </div>
    </li>
  )
}

function CardModulo({ seg, prog, jornada }) {
  const p = CATALOGO[seg.codigo]
  const st = prog.status[seg.id]
  const ids = seg.etapas.flatMap((e) => e.passos.map((x) => x.id))
  const feitos = ids.filter((id) => prog.status[id] === 'concluido').length
  const pct = ids.length ? Math.round((feitos / ids.length) * 100) : 0
  const emAndamento = (st === 'atual' || st === 'embreve') && feitos > 0
  const passoAtual = prog.atual?.tipo === 'passo' && prog.atual.produto === seg.codigo ? prog.atual : null

  const rodape = st === 'bloqueado' ? <span className="cartao-jornada-status">{textoDesbloqueio(jornada, seg)}</span>
    : st === 'preparacao' ? <span className="cartao-jornada-status">Conteúdo em preparação</span>
    : (
      <>
        <Barra pct={pct} fina rotulo={`Progresso do ${p.marca}`} />
        <span className="cartao-jornada-pct">{p.marca}: {pct}% · {feitos} de {ids.length} passos</span>
      </>
    )
  const acao = passoAtual
    ? <a className="btn primario" href={`#/passo/${passoAtual.id}`}>{feitos ? 'Continuar' : 'Começar'} →</a>
    : null
  return (
    <CardJornada st={st} cor={seg.cor} href={st === 'preparacao' ? null : `#/produto/${seg.codigo}`}
      tipo="Módulo" titulo={`${p.marca} - ${p.subtitulo}`} texto={p.resumo}
      icone={emAndamento || passoAtual ? <AnelProgresso pct={pct} /> : null} rodape={rodape} acao={acao} />
  )
}

// Reunião não tem progresso: o rodapé mostra o status (A agendar → Agendada para… → Realizada em…).
function CardReuniao({ seg, prog, jornada, analista, r }) {
  const st = prog.status[seg.id]
  const status = st === 'bloqueado' ? { texto: textoDesbloqueio(jornada, seg), classe: '' }
    : st === 'concluido' ? { texto: `Realizada em ${fmtData(r.realizadaEm)}`, classe: 'concluido' }
    : r.agendadaEm ? { texto: r.agendadaPara ? `Agendada para ${fmtDataHora(r.agendadaPara)}` : 'Agendada', classe: 'atual' }
    : { texto: 'A agendar', classe: 'alerta' }
  const acao = st === 'atual'
    ? <a className="btn primario" href={`#/reuniao/${seg.numero}`}>{r.agendadaEm ? 'Ver agendamento' : 'Agendar reunião'} →</a>
    : null
  return (
    <CardJornada st={st} cor={CATALOGO[seg.produtos.at(-1)]?.cor} href={`#/reuniao/${seg.numero}`}
      tipo="Reunião" titulo={nomeReuniao(seg)}
      texto={`Agende e realize a reunião de revisão do ${listaMarcas(seg.produtos)} com sua analista antes de seguir para a próxima etapa.`}
      rodape={st === 'bloqueado' ? <span className="cartao-jornada-status">{status.texto}</span> : <span className={`selo ${status.classe}`}>{status.texto}</span>}
      acao={acao} />
  )
}

