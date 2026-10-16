import { dadosDoHotel, Barra, Marca, fmtDataHora, saudacao, textoDesbloqueio } from '../comum.jsx'
import { CATALOGO } from '../trilhas.js'

// Minha implantação: barra "Sua jornada" no topo e o passo a passo em cards alternados (módulos e
// reuniões de revisão), ligados por uma linha tracejada, terminando no card "Final da implantação".

const marca = (codigo) => CATALOGO[codigo]?.marca ?? codigo
const listaMarcas = (codigos) => codigos.map(marca).join(codigos.length > 2 ? ', ' : ' e ').replace(/, ([^,]+)$/, ' e $1')

export default function Jornada({ estado, usuario, hotelId }) {
  const d = dadosDoHotel(estado, hotelId)
  if (!d) return <p>Hotel não encontrado.</p>
  const { progresso, jornada, prog } = d
  const a = prog.atual

  // Fases = blocos que terminam numa reunião de revisão.
  const reunioes = jornada.filter((s) => s.tipo === 'reuniao')
  const faseAtual = !a ? reunioes.length
    : a.tipo === 'reuniao' ? reunioes.indexOf(a.reuniao) + 1
    : reunioes.findIndex((r) => r.produtos.includes(a.produto)) + 1
  const rotuloFase = !a ? 'Implantação concluída'
    : `Fase ${faseAtual} de ${reunioes.length} · ${a.tipo === 'passo' ? marca(a.produto) : listaMarcas(a.reuniao.produtos)}`
  const destinoAtual = a ? (a.tipo === 'passo' ? `#/passo/${a.id}` : `#/reuniao/${a.numero}`) : null
  const proximo = a ? (a.tipo === 'passo' ? a.passo.titulo : `Reunião de revisão geral — ${listaMarcas(a.reuniao.produtos)}`) : null
  const Barra_ = destinoAtual ? 'a' : 'div'

  return (
    <>
      <h1 className="jornada-saudacao">{saudacao()}, <span className="destaque-nome">{usuario.nome.split(' ')[0]}</span>.</h1>

      <Barra_ className="sua-jornada" {...(destinoAtual ? { href: destinoAtual, 'aria-label': `Continuar: ${proximo}` } : {})}>
        <span className="sua-jornada-rotulo">Sua jornada</span>
        <Barra pct={prog.pct} rotulo="Progresso da implantação" />
        <span className="sua-jornada-fase">{rotuloFase}</span>
        <span className="sua-jornada-resumo">{prog.feitas} de {prog.total} passos concluídos</span>
        {destinoAtual && <Chevron />}
      </Barra_>

      <h2 className="secao-titulo passo-a-passo-titulo">Passo a passo</h2>
      <ol className="passo-a-passo">
        {jornada.map((seg) => (seg.tipo === 'produto'
          ? <CardModulo key={seg.id} seg={seg} prog={prog} jornada={jornada} />
          : <CardReuniao key={seg.id} seg={seg} prog={prog} jornada={jornada} r={progresso.reunioes?.[seg.numero] ?? {}} />))}
        <li className={`etapa-jornada final ${a ? 'bloqueado' : 'concluido'}`}>
          <div className="cartao-jornada">
            <div className="cartao-jornada-topo">
              <span className="icone-final" aria-hidden="true">🎉</span>
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

const Chevron = () => (
  <svg className="chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

// Card de um item do passo a passo: link quando liberado; rodapé com barra na cor do produto e %.
function CardJornada({ st, cor, href, tipo, titulo, texto, pct, nota }) {
  const aberto = href && st !== 'bloqueado'
  const Tag = aberto ? 'a' : 'div'
  return (
    <li className={`etapa-jornada ${st}`} style={{ '--cor': cor }}>
      <Tag className="cartao-jornada" {...(aberto ? { href } : {})}>
        <div className="cartao-jornada-topo">
          <Marca status={st} />
          <div>
            <p className="cartao-jornada-tipo">{tipo}</p>
            <h3>{titulo}</h3>
          </div>
        </div>
        <p className="cartao-jornada-texto">{texto}</p>
        {nota && <p className="cartao-jornada-nota">{nota}</p>}
        <div className="cartao-jornada-rodape">
          <Barra pct={pct} fina rotulo={`Progresso de ${titulo}`} />
          <span>{pct}%</span>
          {aberto && <Chevron />}
        </div>
      </Tag>
    </li>
  )
}

function CardModulo({ seg, prog, jornada }) {
  const p = CATALOGO[seg.codigo]
  const st = prog.status[seg.id]
  const ids = seg.etapas.flatMap((e) => e.passos.map((x) => x.id))
  const feitos = ids.filter((id) => prog.status[id] === 'concluido').length
  const pct = ids.length ? Math.round((feitos / ids.length) * 100) : 0
  const nota = st === 'bloqueado' ? textoDesbloqueio(jornada, seg)
    : st === 'preparacao' ? 'O conteúdo deste módulo está sendo preparado. Ele não trava a sua jornada.'
    : st === 'embreve' ? 'Os próximos passos deste módulo estão sendo preparados.'
    : ids.length ? `${feitos} de ${ids.length} passos concluídos` : null
  return (
    <CardJornada st={st} cor={seg.cor} href={st === 'preparacao' ? null : `#/produto/${seg.codigo}`}
      tipo="Módulo" titulo={`${p.marca} - ${p.subtitulo}`} texto={p.resumo} pct={pct} nota={nota} />
  )
}

function CardReuniao({ seg, prog, jornada, r }) {
  const st = prog.status[seg.id]
  const ultimo = seg.produtos.at(-1)
  const nota = st === 'bloqueado' ? textoDesbloqueio(jornada, seg)
    : st === 'concluido' ? `Realizada em ${fmtDataHora(r.realizadaEm)}`
    : r.agendadaEm ? (r.agendadaPara ? `Agendada para ${fmtDataHora(r.agendadaPara)} · aguardando a confirmação da analista` : 'Agendada pelo Calendly · aguardando a confirmação da analista')
    : 'Pronta para agendar'
  return (
    <CardJornada st={st} cor={CATALOGO[ultimo]?.cor} href={`#/reuniao/${seg.numero}`}
      tipo="Reunião" titulo={`Reunião de Revisão Geral — ${listaMarcas(seg.produtos)}`}
      texto="Agende e realize a reunião de revisão com sua analista antes de seguir para a próxima etapa."
      pct={st === 'concluido' ? 100 : 0} nota={nota} />
  )
}
