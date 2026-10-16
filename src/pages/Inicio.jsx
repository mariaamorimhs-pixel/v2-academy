import { useState } from 'react'
import { dadosDoHotel, nomeReuniao, JanelaCalendly, saudacao, ProgressoImplantacao, Selo } from '../comum.jsx'
import { CATALOGO, TREINAMENTOS_GRUPO, ORDEM_TUTORIAIS, corProduto, nomeProduto } from '../trilhas.js'

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
        <ul className="cartao lista-treinos">
          {TREINAMENTOS_GRUPO.map((t) => (
            <li key={t.id}>
              <span className="produto-rotulo" style={{ '--cor': t.cor }}><b>{t.titulo}</b></span>
              <span className="muted pequeno">
                {t.descricao}
                {t.produtos.some((p) => doMomento.includes(p)) && <> <Selo status="atual">Do seu próximo passo</Selo></>}
              </span>
              <button className="btn" onClick={() => setCalendly(t)}>Ver horários</button>
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
                <b>{nomeProduto(codigo)}</b>
                {vazio ? <span className="cartao-tutorial-selo"><Selo status="embreve" /></span> : <span>{p.descricao}</span>}
              </Tag>
            )
          })}
        </div>
      </section>

      {calendly && <JanelaCalendly treino={calendly} onFechar={() => setCalendly(null)} />}
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
  return (
    <section className="cartao implantacao-destaque">
      <div className="implantacao-topo">
        <span className="sobre">Minha implantação</span>
        <span className="numero-medio">{prog.pct}%</span>
      </div>
      <p className="muted pequeno">Próximo passo</p>
      <h2 className="proximo-passo">{a.tipo === 'passo' ? a.passo.titulo : `${nomeReuniao(a.reuniao)} com ${analista?.nome ?? 'seu analista'}`}</h2>
      <p className="muted">{a.tipo === 'passo' ? `${seg.nome} · ${a.etapa.titulo}` : 'Agende pelo calendário do seu analista'}</p>
      <div className="implantacao-rodape">
        <ProgressoImplantacao prog={prog} />
        <a className="btn primario" href={destino}>Continuar →</a>
      </div>
      <a className="link pequeno" href="#/implantacao">Ver a trilha completa</a>
    </section>
  )
}
