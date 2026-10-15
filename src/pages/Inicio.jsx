import { useEffect, useState } from 'react'
import { dadosDoHotel, Barra, nomeReuniao } from '../comum.jsx'
import { CATALOGO, TREINAMENTOS_GRUPO, ORDEM_TUTORIAIS, corProduto, nomeProduto } from '../trilhas.js'

const saudacao = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

// Tela inicial do cliente: a implantação em destaque (tarefa principal), depois treinamentos ao vivo e tutoriais.
export default function Inicio({ estado, usuario, hotelId }) {
  const d = dadosDoHotel(estado, hotelId)
  const [calendly, setCalendly] = useState(null)
  if (!d) return <p>Hotel não encontrado.</p>
  const { hotel } = d

  return (
    <>
      <header className="inicio-cabeca">
        <h1>{saudacao()}, <span className="destaque-nome">{usuario.nome.split(' ')[0]}</span>.</h1>
        <p className="sobre">{hotel.nome}</p>
      </header>

      <CartaoImplantacao d={d} />

      <section className="secao">
        <h2 className="secao-titulo">Treinamentos ao vivo em grupo</h2>
        <p className="muted pequeno">Turmas com especialistas da HSystem. Escolha o melhor horário e se inscreva.</p>
        <ul className="cartao lista-treinos">
          {TREINAMENTOS_GRUPO.map((t) => (
            <li key={t.id}>
              <span className="produto-rotulo" style={{ '--cor': t.cor }}><b>{t.titulo}</b></span>
              <span className="muted pequeno">{t.descricao}</span>
              <button className="btn" onClick={() => setCalendly(t)}>Ver horários ↗</button>
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
                {...(vazio ? {} : { href: `#/tutoriais/${codigo}` })}>
                {!vazio && <span className="seta" aria-hidden="true">→</span>}
                <b>{nomeProduto(codigo)}</b>
                <span>{vazio ? 'Em breve' : p.descricao}</span>
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
  const cor = seg ? seg.cor : 'var(--marca)'
  const destino = a.tipo === 'passo' ? `#/passo/${a.id}` : `#/reuniao/${a.numero}`
  return (
    <section className="cartao implantacao-destaque" style={{ '--cor': cor }}>
      <div className="implantacao-topo">
        <span className="sobre">Minha implantação</span>
        <span className="numero-medio">{prog.pct}%</span>
      </div>
      <p className="muted pequeno">Próximo passo</p>
      <h2 className="proximo-passo">{a.tipo === 'passo' ? a.passo.titulo : `${nomeReuniao(a.reuniao)} com ${analista?.nome ?? 'seu analista'}`}</h2>
      <p className="muted">{a.tipo === 'passo' ? `${seg.nome} · ${a.etapa.titulo}` : 'Agende pelo calendário do seu analista'}</p>
      <div className="implantacao-rodape">
        <Barra pct={prog.pct} />
        <span className="muted pequeno">{prog.feitas} de {prog.total}</span>
        <a className="btn primario" href={destino}>Continuar →</a>
      </div>
      <a className="link pequeno" href="#/implantacao">Ver a trilha completa</a>
    </section>
  )
}

// Agenda da turma do Calendly por cima da tela, sem sair do sistema.
function JanelaCalendly({ treino, onFechar }) {
  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', aoTeclar)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', aoTeclar); document.body.style.overflow = '' }
  }, [onFechar])
  const url = `${treino.url}?embed_type=Inline&hide_gdpr_banner=1&embed_domain=${window.location.hostname}`
  return (
    <div className="janela-fundo" onClick={onFechar}>
      <div className="janela" role="dialog" aria-modal="true" aria-label={`Treinamento em grupo de ${treino.titulo}`} onClick={(e) => e.stopPropagation()}>
        <header>
          <b>Treinamento em grupo · {treino.titulo}</b>
          <button className="btn fantasma pequeno" onClick={onFechar} aria-label="Fechar">Fechar ✕</button>
        </header>
        <iframe src={url} title={`Agenda do treinamento de ${treino.titulo}`} />
      </div>
    </div>
  )
}
