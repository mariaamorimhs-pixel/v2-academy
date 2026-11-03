import { useState } from 'react'
import { CATALOGO } from '../trilhas.js'
import { salvarConteudo, restaurarConteudo, editarTrilha } from '../dados.js'
import { youtubeId, tentar } from '../comum.jsx'
import { ConteudoPasso } from './Passo.jsx'

// Área de conteúdo (admin): escolhe um passo na árvore produto → etapa → passo e edita título, vídeo e texto.
// Com "Editar estrutura" ligado, dá para adicionar, reordenar, renomear e excluir etapas e passos
// (excluir esconde: some da trilha e da porcentagem, e dá para restaurar).
export default function Editor({ estado, passoId }) {
  const [estruturando, setEstruturando] = useState(false)
  const produtos = Object.values(CATALOGO)
  const todos = produtos.flatMap((p) => p.etapas.flatMap((e) => e.passos.map((ps) => ({ produto: p, etapa: e, passo: ps }))))
  const sel = todos.find((x) => x.passo.id === passoId) ?? todos[0]
  const editados = estado.conteudo
  const { etapas: todasEtapas = [], passos: todosPassos = [] } = estado.estrutura ?? {}
  const nomePasso = (ps) => editados[ps.id]?.titulo || ps.titulo

  const acao = (a, alvo, texto) => tentar(() => editarTrilha(a, alvo, texto))
  async function novoPasso(etapa) {
    const titulo = prompt(`Nome do novo passo em "${etapa.titulo}":`)
    if (!titulo?.trim()) return
    let id
    if (await tentar(async () => { id = await editarTrilha('novo_passo', etapa.id, titulo) })) window.location.hash = `/passo/${id}`
  }
  async function novaEtapa(produto) {
    const titulo = prompt(`Nome da nova etapa do ${produto.nome}:`)
    if (titulo?.trim()) await acao('nova_etapa', produto.codigo, titulo)
  }
  async function renomearEtapa(etapa) {
    const titulo = prompt('Novo nome da etapa:', etapa.titulo)
    if (titulo?.trim() && titulo.trim() !== etapa.titulo) await acao('renomear_etapa', etapa.id, titulo)
  }
  async function excluirEtapa(etapa) {
    if (confirm(`Excluir a etapa "${etapa.titulo}" e os ${etapa.passos.length} passo(s) dela? Ela some da trilha dos clientes; dá para restaurar depois.`)) await acao('excluir_etapa', etapa.id)
  }
  async function excluirPasso(ps) {
    if (confirm(`Excluir o passo "${nomePasso(ps)}"? Ele some da trilha e da porcentagem; quem já concluiu continua registrado e dá para restaurar depois.`)) await acao('excluir_passo', ps.id)
  }

  return (
    <div className="editor">
      <div className="editor-lado">
        <button type="button" className={`btn pequeno ${estruturando ? 'primario' : ''}`} aria-pressed={estruturando} onClick={() => setEstruturando(!estruturando)}>
          {estruturando ? 'Concluir edição da estrutura' : 'Editar estrutura'}
        </button>
        <nav className={`editor-arvore cartao ${estruturando ? 'estruturando' : ''}`} aria-label="Trilhas">
          {produtos.map((p) => {
            const etapasExcluidas = todasEtapas.filter((e) => e.produto === p.codigo && e.oculta)
            const idsEtapas = new Set(p.etapas.map((e) => e.id))
            const passosExcluidos = todosPassos.filter((x) => x.oculto && idsEtapas.has(x.etapa_id))
            return (
              <details key={p.codigo} open={p.codigo === sel?.produto.codigo || (estruturando && !p.etapas.length)}>
                <summary><b className="produto-rotulo" style={{ '--cor': p.cor }}>{p.nome}</b> <span className="muted pequeno">{p.etapas.reduce((n, e) => n + e.passos.length, 0)} passos</span></summary>
                {!p.etapas.length && <p className="muted pequeno arvore-vazia">Trilha ainda sem etapas.</p>}
                {p.etapas.map((e, i) => (
                  <div key={e.id} className="arvore-etapa">
                    <div className="arvore-etapa-linha">
                      <p className="arvore-etapa-titulo">{i + 1}. {e.titulo}{e.somenteSem && <span className="muted"> · só sem {CATALOGO[e.somenteSem]?.nome}</span>}</p>
                      {estruturando && (
                        <span className="arvore-acoes">
                          <BotaoIcone rotulo={`Subir a etapa ${e.titulo}`} onClick={() => acao('subir_etapa', e.id)} disabled={i === 0}>↑</BotaoIcone>
                          <BotaoIcone rotulo={`Descer a etapa ${e.titulo}`} onClick={() => acao('descer_etapa', e.id)} disabled={i === p.etapas.length - 1}>↓</BotaoIcone>
                          <BotaoIcone rotulo={`Renomear a etapa ${e.titulo}`} onClick={() => renomearEtapa(e)}>✎</BotaoIcone>
                          <BotaoIcone rotulo={`Excluir a etapa ${e.titulo}`} onClick={() => excluirEtapa(e)} perigo>✕</BotaoIcone>
                        </span>
                      )}
                    </div>
                    {e.passos.map((ps, j) => (
                      <div key={ps.id} className="arvore-passo-linha">
                        <a href={`#/passo/${ps.id}`} className={`arvore-passo ${ps.id === sel?.passo.id ? 'ativa' : ''}`}>
                          <span>{nomePasso(ps)}</span>
                          {editados[ps.id]?.video && youtubeId(editados[ps.id].video) ? <span className="ponto ok" title="Tem vídeo" /> : <span className="ponto" title="Sem vídeo" />}
                        </a>
                        {estruturando && (
                          <span className="arvore-acoes">
                            <BotaoIcone rotulo={`Subir o passo ${nomePasso(ps)}`} onClick={() => acao('subir_passo', ps.id)} disabled={j === 0}>↑</BotaoIcone>
                            <BotaoIcone rotulo={`Descer o passo ${nomePasso(ps)}`} onClick={() => acao('descer_passo', ps.id)} disabled={j === e.passos.length - 1}>↓</BotaoIcone>
                            <BotaoIcone rotulo={`Excluir o passo ${nomePasso(ps)}`} onClick={() => excluirPasso(ps)} perigo>✕</BotaoIcone>
                          </span>
                        )}
                      </div>
                    ))}
                    {estruturando && <button type="button" className="link pequeno arvore-adicionar" onClick={() => novoPasso(e)}>+ Passo</button>}
                  </div>
                ))}
                {estruturando && <button type="button" className="link pequeno arvore-adicionar" onClick={() => novaEtapa(p)}>+ Etapa no {p.nome}</button>}
                {estruturando && (etapasExcluidas.length > 0 || passosExcluidos.length > 0) && (
                  <div className="arvore-excluidos">
                    <p className="muted pequeno">Excluídos</p>
                    {etapasExcluidas.map((e) => (
                      <div key={e.id} className="arvore-passo-linha">
                        <span className="muted pequeno">Etapa: {e.titulo}</span>
                        <button type="button" className="link pequeno" onClick={() => acao('restaurar_etapa', e.id)}>Restaurar</button>
                      </div>
                    ))}
                    {passosExcluidos.map((x) => (
                      <div key={x.id} className="arvore-passo-linha">
                        <span className="muted pequeno">{editados[x.id]?.titulo || x.titulo}</span>
                        <button type="button" className="link pequeno" onClick={() => acao('restaurar_passo', x.id)}>Restaurar</button>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            )
          })}
        </nav>
      </div>
      {sel
        ? <FormPasso key={sel.passo.id} sel={sel} salvo={editados[sel.passo.id]} />
        : <div className="cartao"><p className="muted">Nenhum passo nas trilhas. Use "Editar estrutura" para criar.</p></div>}
    </div>
  )
}

function BotaoIcone({ rotulo, onClick, disabled, perigo, children }) {
  return <button type="button" className={`botao-icone ${perigo ? 'perigo' : ''}`} aria-label={rotulo} title={rotulo} onClick={onClick} disabled={disabled}>{children}</button>
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
          Texto
          <textarea rows={10} value={form.texto} onChange={campo('texto')} placeholder={'Explique o que o cliente deve fazer neste passo.\n\nDeixe uma linha em branco entre parágrafos.\n- Linhas começando com hífen viram lista'} />
        </label>
        <label>
          Link do vídeo no YouTube
          <input value={form.video} onChange={campo('video')} placeholder="https://youtu.be/…" />
          {videoInvalido && <span className="erro-campo">Não reconheci este link do YouTube.</span>}
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
