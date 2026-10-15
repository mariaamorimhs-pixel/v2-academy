import { useState } from 'react'
import { CATALOGO } from '../trilhas.js'
import { salvarConteudo, restaurarConteudo } from '../dados.js'
import { youtubeId, tentar } from '../comum.jsx'
import { ConteudoPasso } from './Passo.jsx'

// Área da editora: escolhe um passo na árvore produto → etapa → passo e edita título, vídeo e texto.
// A estrutura das trilhas não muda aqui; ela vem dos produtos contratados.
export default function Editor({ estado, passoId }) {
  const produtos = Object.values(CATALOGO)
  const todos = produtos.flatMap((p) => p.etapas.flatMap((e) => e.passos.map((ps) => ({ produto: p, etapa: e, passo: ps }))))
  const sel = todos.find((x) => x.passo.id === passoId) ?? todos[0]
  const editados = estado.conteudo

  return (
    <div className="editor">
      <nav className="editor-arvore cartao" aria-label="Trilhas">
        {produtos.map((p) => (
          <details key={p.codigo} open={p.codigo === sel.produto.codigo}>
            <summary><b className="produto-rotulo" style={{ '--cor': p.cor }}>{p.nome}</b> <span className="muted pequeno">{p.etapas.reduce((n, e) => n + e.passos.length, 0)} passos</span></summary>
            {!p.etapas.length && <p className="muted pequeno arvore-vazia">Trilha ainda não enviada.</p>}
            {p.etapas.map((e, i) => (
              <div key={e.id} className="arvore-etapa">
                <p className="arvore-etapa-titulo">{i + 1}. {e.titulo}{e.somenteSem && <span className="muted"> · só sem {CATALOGO[e.somenteSem].nome}</span>}</p>
                {e.passos.map((ps) => {
                  const c = editados[ps.id]
                  return (
                    <a key={ps.id} href={`#/passo/${ps.id}`} className={`arvore-passo ${ps.id === sel.passo.id ? 'ativa' : ''}`}>
                      <span>{c?.titulo || ps.titulo}</span>
                      {c?.video && youtubeId(c.video) ? <span className="ponto ok" title="Tem vídeo" /> : <span className="ponto" title="Sem vídeo" />}
                    </a>
                  )
                })}
              </div>
            ))}
          </details>
        ))}
      </nav>
      <FormPasso key={sel.passo.id} sel={sel} salvo={editados[sel.passo.id]} />
    </div>
  )
}

function FormPasso({ sel, salvo }) {
  const padrao = { titulo: sel.passo.titulo, video: '', texto: '' }
  const [form, setForm] = useState({ ...padrao, ...salvo })
  const [msg, setMsg] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const mudou = JSON.stringify({ ...padrao, ...salvo }) !== JSON.stringify(form)
  const videoInvalido = form.video.trim() && !youtubeId(form.video)
  const campo = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setMsg(null) }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const dados = { titulo: form.titulo.trim() || padrao.titulo, video: form.video.trim(), texto: form.texto }
    if (await tentar(() => salvarConteudo(sel.passo.id, dados))) setMsg('Salvo. Os clientes já veem a nova versão.')
    setSalvando(false)
  }
  async function restaurar() {
    if (!confirm('Voltar este passo ao conteúdo padrão? O texto e o vídeo salvos serão apagados.')) return
    if (await tentar(() => restaurarConteudo(sel.passo.id))) {
      setForm(padrao)
      setMsg('Conteúdo padrão restaurado.')
    }
  }

  return (
    <div className="editor-form">
      <form className="cartao" onSubmit={salvar}>
        <p className="sobre">{sel.produto.nome} · {sel.etapa.titulo}</p>
        <label>Título do passo<input value={form.titulo} onChange={campo('titulo')} /></label>
        <label>
          Link do vídeo no YouTube
          <input value={form.video} onChange={campo('video')} placeholder="https://youtu.be/…" />
          {videoInvalido && <span className="erro-campo">Não reconheci este link do YouTube.</span>}
        </label>
        <label>
          Texto
          <textarea rows={10} value={form.texto} onChange={campo('texto')} placeholder={'Explique o que o cliente deve fazer neste passo.\n\nDeixe uma linha em branco entre parágrafos.\n- Linhas começando com hífen viram lista'} />
        </label>
        {msg && <div className="alerta ok">{msg}</div>}
        <div className="acoes">
          <button className="btn primario" disabled={!mudou || videoInvalido || salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          {salvo && <button type="button" className="btn fantasma" onClick={restaurar}>Restaurar padrão</button>}
        </div>
      </form>
      <section className="previa">
        <p className="previa-rotulo">Como o cliente vê</p>
        <div className="cartao">
          <ConteudoPasso produtoNome={sel.produto.nome} etapaTitulo={sel.etapa.titulo} passo={form} />
        </div>
      </section>
    </div>
  )
}
