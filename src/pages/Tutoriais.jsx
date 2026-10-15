import { CATALOGO } from '../trilhas.js'
import { ConteudoPasso } from './Passo.jsx'

// Tutoriais: a mesma estrutura e o mesmo conteúdo das trilhas, para consulta livre (sem trava e sem "Concluí").

// Passos de um produto com o conteúdo editado pela editora aplicado.
function produtoComConteudo(codigo, conteudo) {
  const p = CATALOGO[codigo]
  if (!p) return null
  return { ...p, etapas: p.etapas.map((e) => ({ ...e, passos: e.passos.map((ps) => ({ ...ps, ...conteudo[ps.id] })) })) }
}

const Voltar = ({ href, texto }) => <a href={href} className="voltar">← {texto}</a>

export function TutoriaisProduto({ estado, codigo }) {
  const p = produtoComConteudo(codigo, estado.conteudo)
  if (!p || !p.etapas.length) return <><Voltar href="#/" texto="Início" /><p>Tutorial em preparação.</p></>
  return (
    <>
      <Voltar href="#/" texto="Início" />
      <header className="cabecalho cabecalho-produto" style={{ '--cor': p.cor }}>
        <div>
          <h1>{p.nome}</h1>
          <p className="muted">{p.descricao} · consulte qualquer passo quando quiser</p>
        </div>
      </header>
      <div className="etapas">
        {p.etapas.map((e, i) => (
          <section key={e.id} className="etapa">
            <header>
              <span className="etapa-num">{i + 1}</span>
              <div>
                <h2>{e.titulo}</h2>
                {e.nota && <p className="muted pequeno">{e.nota}</p>}
              </div>
              <span className="pequeno muted">{e.passos.length} {e.passos.length === 1 ? 'passo' : 'passos'}</span>
            </header>
            <ul className="passos">
              {e.passos.map((ps) => (
                <li key={ps.id}>
                  <a className="passo-linha" href={`#/tutorial/${ps.id}`}>
                    <span className="seta-passo" aria-hidden="true">›</span>
                    <span>{ps.titulo}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

export function TutorialPasso({ estado, passoId }) {
  const codigo = Object.keys(CATALOGO).find((c) => passoId?.startsWith(c.toLowerCase() + '-'))
  const p = codigo && produtoComConteudo(codigo, estado.conteudo)
  const lista = p ? p.etapas.flatMap((e) => e.passos.map((ps) => ({ etapa: e, passo: ps }))) : []
  const i = lista.findIndex((x) => x.passo.id === passoId)
  if (i < 0) return <><Voltar href="#/" texto="Início" /><p>Tutorial não encontrado.</p></>
  const { etapa, passo } = lista[i]
  const prox = lista[i + 1]
  return (
    <>
      <Voltar href={`#/tutoriais/${codigo}`} texto={`Tutoriais do ${p.nome}`} />
      <div className="passo-layout">
        <ConteudoPasso produtoNome={p.nome} etapaTitulo={etapa.titulo} passo={passo} />
        <aside className="cartao passo-acoes">
          <p className="muted pequeno">Modo consulta: este tutorial não altera o andamento da sua implantação.</p>
          {prox
            ? <a className="btn primario" href={`#/tutorial/${prox.passo.id}`}>Próximo tutorial: {prox.passo.titulo}</a>
            : <a className="btn" href={`#/tutoriais/${codigo}`}>Voltar aos tutoriais do {p.nome}</a>}
        </aside>
      </div>
    </>
  )
}
