import { useState } from 'react'
import { dadosDoHotel, nomeReuniao, JanelaCalendly, saudacao, ProgressoImplantacao, Selo, fmtData, fmtDataHora, tentar } from '../comum.jsx'
import { registrarInscricao } from '../dados.js'
import { CATALOGO, TREINAMENTOS_GRUPO, ORDEM_TUTORIAIS, IMAGEM_TUTORIAL, corProduto, nomeProduto } from '../trilhas.js'

const IconeVideo = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="1.5" y="4" width="9" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 7l4-2.2v6.4l-4-2.2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
)
const IconeRelogio = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 4.6V8l2.4 1.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
)

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
// Próxima data da turma: o próximo dia da semana dela que ainda não passou do horário de início.
function proximaData(sessao) {
  const alvo = DIAS.indexOf(sessao.dia.toLowerCase())
  const hora = parseInt(sessao.hora, 10)
  const agora = new Date()
  const d = new Date(agora)
  d.setHours(hora, 0, 0, 0)
  let soma = (alvo - agora.getDay() + 7) % 7
  if (soma === 0 && d <= agora) soma = 7
  d.setDate(d.getDate() + soma)
  return `${DIAS[d.getDay()].slice(0, 3)}, ${d.getDate()}/${MESES[d.getMonth()]}`
}

// Inscrição feita pela janela do Calendly nos últimos 7 dias: mostra "Inscrito ✓".
const DIAS_INSCRICAO_VALE = 7
function BotaoInscricao({ treino, inscricao, onAbrir }) {
  const recente = inscricao && Date.now() - new Date(inscricao.em).getTime() < DIAS_INSCRICAO_VALE * 864e5
  if (!recente) {
    return <button className="btn primario" onClick={onAbrir} aria-label={`Fazer inscrição no treinamento em grupo do ${treino.titulo}`}>Fazer inscrição</button>
  }
  return (
    <div className="treino-inscrito">
      <span className="selo concluido">Inscrito ✓ em {fmtData(inscricao.em)}</span>
      <button className="btn" onClick={onAbrir} aria-label={`Ver horários do treinamento em grupo do ${treino.titulo}`}>Ver horários</button>
    </div>
  )
}

// Produtos ligados ao item atual da implantação (o produto do passo, ou os produtos da reunião).
function produtosDoMomento(prog) {
  const a = prog.atual
  if (!a) return []
  return a.tipo === 'passo' ? [a.produto] : a.reuniao.produtos
}

// Tela inicial do cliente: a implantação em destaque (tarefa principal), depois treinamentos ao vivo e tutoriais.
export default function Inicio({ estado, usuario, hotelId }) {
  const d = dadosDoHotel(estado, hotelId)
  const [calendly, setCalendly] = useState(null)
  if (!d) return <p>Hotel não encontrado.</p>
  const doMomento = produtosDoMomento(d.prog)

  return (
    <>
      <header className="inicio-cabeca">
        <h1>{saudacao()}, <span className="destaque-nome">{usuario.nome.split(' ')[0]}</span>.</h1>
      </header>

      <CartaoImplantacao d={d} />

      <section className="secao">
        <h2 className="secao-titulo">Treinamentos ao vivo em grupo</h2>
        <p className="muted pequeno">Turmas com especialistas da HSystem. Escolha o melhor horário e se inscreva.</p>
        <ul className="grade-treinos">
          {TREINAMENTOS_GRUPO.map((t) => (
            <li key={t.id} className="cartao-treino" style={{ '--cor': t.cor }}>
              {t.produtos.some((p) => doMomento.includes(p)) && <Selo status="atual">Do seu próximo passo</Selo>}
              <h3>Treinamento em grupo do {t.titulo}</h3>
              <p className="treino-meta">
                <span><IconeVideo /> Webinar no Zoom</span>
                <span aria-hidden="true">·</span>
                <span><IconeRelogio /> 1 hora</span>
              </p>
              <ul className="treino-sessoes">
                {t.sessoes.map((s) => (
                  <li key={s.dia}>
                    <span className="treino-dia">Toda {s.dia.toLowerCase()}</span>
                    <span className="treino-proxima">próxima: {proximaData(s)}</span>
                    <span className="treino-hora">{s.hora.replace("h00", "h")}</span>
                  </li>
                ))}
              </ul>
              <BotaoInscricao treino={t} inscricao={d.inscricoes?.[t.id]} onAbrir={() => setCalendly(t)} />
            </li>
          ))}
        </ul>
      </section>

      <section className="secao">
        <h2 className="secao-titulo">Tutoriais</h2>
        <div className="grade-tutoriais">
          {ORDEM_TUTORIAIS.map((codigo) => {
            const p = CATALOGO[codigo]
            const vazio = !p.etapas.length
            const Tag = vazio ? 'div' : 'a'
            return (
              <Tag key={codigo} className={`cartao-tutorial ${vazio ? 'vazio' : ''}`} style={{ '--cor': corProduto(codigo) }}
                aria-label={`Tutoriais de ${nomeProduto(codigo)}: ${vazio ? 'em breve' : p.descricao}`}
                {...(vazio ? { role: 'group' } : { href: `#/tutoriais/${codigo}` })}>
                {IMAGEM_TUTORIAL[codigo] && !vazio ? (
                  <img src={IMAGEM_TUTORIAL[codigo]} alt="" loading="lazy" />
                ) : (
                  <span className="cartao-tutorial-texto">
                    <b>{nomeProduto(codigo)}</b>
                    {vazio ? <Selo status="embreve" /> : <span>{p.descricao}</span>}
                  </span>
                )}
              </Tag>
            )
          })}
        </div>
      </section>

      {calendly && <JanelaCalendly treino={calendly} onFechar={() => setCalendly(null)} onAgendado={() => tentar(() => registrarInscricao(hotelId, calendly.id))} />}
    </>
  )
}

// Cartão de destaque: o próximo passo é o texto principal; a porcentagem é contexto.
function CartaoImplantacao({ d }) {
  const { prog, jornada, analista } = d
  const a = prog.atual
  if (!a) {
    return (
      <a className="cartao implantacao-concluida" href="#/implantacao">
        <span className="ok-texto">Implantação concluída ✓</span>
        <span className="muted pequeno">Rever a trilha</span>
      </a>
    )
  }
  const seg = a.tipo === 'passo' ? jornada.find((s) => s.id === a.produto) : null
  const destino = a.tipo === 'passo' ? `#/passo/${a.id}` : `#/reuniao/${a.numero}`
  const r = a.tipo === 'reuniao' ? d.progresso.reunioes?.[a.numero] ?? {} : null
  // O botão diz exatamente o que acontece ao clicar.
  const rotuloBotao = !r ? 'Continuar' : r.agendadaEm ? 'Ver agendamento' : 'Agendar reunião'
  const detalhe = !r ? `${seg.nome} · ${a.etapa.titulo}`
    : r.agendadaEm ? (r.agendadaPara ? `Agendada para ${fmtDataHora(r.agendadaPara)} · aguardando a confirmação da analista` : 'Agendada · aguardando a confirmação da analista')
    : 'Escolha um horário na agenda da sua analista'
  return (
    <section className="cartao implantacao-destaque">
      <div className="implantacao-topo">
        <span className="implantacao-titulo">Próximo passo</span>
        <span className="implantacao-pct">Implantação: <b>{prog.pct}%</b></span>
      </div>
      <h2 className="proximo-passo">{a.tipo === 'passo' ? a.passo.titulo : nomeReuniao(a.reuniao, analista)}</h2>
      <p className="muted">{detalhe}</p>
      <div className="implantacao-rodape">
        <ProgressoImplantacao prog={prog} />
        <a className="btn primario" href={destino}>{rotuloBotao} →</a>
      </div>
      <a className="link pequeno" href="#/implantacao">Ver a trilha completa</a>
    </section>
  )
}
