import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase.js'
import { tentar, fmtDataHora } from '../comum.jsx'

// Pesquisas públicas (só admin): lista, editor e respostas. A pesquisa abre sem login em #/pesquisa/<endereço>
// e, ao enviar, leva a pessoa para o endereço de redirecionamento.

export const TIPOS = {
  texto: 'Texto curto',
  texto_longo: 'Texto longo',
  escolha_uma: 'Múltipla escolha (uma opção)',
  escolha_varias: 'Múltipla escolha (várias opções)',
}
const comOpcoes = (tipo) => tipo === 'escolha_uma' || tipo === 'escolha_varias'
export const linkPesquisa = (slug) => `${window.location.origin}${window.location.pathname}#/pesquisa/${slug}`
const paraSlug = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
const novoId = () => Math.random().toString(36).slice(2, 10)

async function carregarPesquisas() {
  const [p, r] = await Promise.all([
    supabase.from('impl_pesquisas').select('*').order('criado_em', { ascending: false }),
    supabase.from('impl_respostas').select('pesquisa_id'),
  ])
  if (p.error) throw new Error(p.error.message)
  const contagem = {}
  for (const x of r.data ?? []) contagem[x.pesquisa_id] = (contagem[x.pesquisa_id] ?? 0) + 1
  return p.data.map((x) => ({ ...x, respostas: contagem[x.id] ?? 0 }))
}

// Roteia dentro de #/pesquisas: lista, #/pesquisas/nova, #/pesquisas/<id>, #/pesquisas/<id>/respostas
export default function Pesquisas({ rota }) {
  const [, id, sub] = rota
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState(null)
  const recarregar = () => carregarPesquisas().then(setLista).catch((e) => setErro(e.message))
  useEffect(() => { recarregar() }, [])

  if (erro) return <div className="alerta erro">Não foi possível carregar as pesquisas: {erro}</div>
  if (!lista) return <p className="muted">Carregando…</p>
  if (id === 'nova') return <EditorPesquisa onSalvo={recarregar} />
  if (id) {
    const p = lista.find((x) => x.id === id)
    if (!p) return <><a href="#/pesquisas" className="voltar">← Pesquisas</a><p>Pesquisa não encontrada.</p></>
    return sub === 'respostas' ? <Respostas pesquisa={p} /> : <EditorPesquisa pesquisa={p} onSalvo={recarregar} />
  }
  return <ListaPesquisas lista={lista} />
}

function BotaoCopiar({ texto }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try { await navigator.clipboard.writeText(texto) } catch { window.prompt('Copie o link:', texto); return }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }
  return <button type="button" className="btn pequeno" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar link'}</button>
}

function ListaPesquisas({ lista }) {
  return (
    <>
      <header className="cabecalho">
        <div>
          <h1>Pesquisas</h1>
          <p className="muted">Pesquisas que abrem por link, sem login. As respostas são anônimas e, ao enviar, a pessoa vai para o endereço que você escolher.</p>
        </div>
        <a className="btn primario" href="#/pesquisas/nova">Nova pesquisa</a>
      </header>
      {lista.length === 0 ? (
        <div className="cartao vazio-cartao"><p>Nenhuma pesquisa criada ainda.</p><a className="btn" href="#/pesquisas/nova">Criar a primeira pesquisa</a></div>
      ) : (
        <ul className="visao-lista">
          {lista.map((p) => (
            <li key={p.id} className="cartao pesquisa-item">
              <div className="pesquisa-item-info">
                <b>{p.titulo}</b>{' '}
                <span className={`selo ${p.ativa ? 'concluido' : ''}`}>{p.ativa ? 'Ativa' : 'Pausada'}</span>
                <span className="muted pequeno">{p.perguntas.length} pergunta(s) · {p.respostas} resposta(s) · {linkPesquisa(p.slug)}</span>
              </div>
              <div className="acoes">
                <BotaoCopiar texto={linkPesquisa(p.slug)} />
                <a className="btn pequeno" href={`#/pesquisas/${p.id}/respostas`}>Respostas</a>
                <a className="btn pequeno" href={`#/pesquisas/${p.id}`}>Editar</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function EditorPesquisa({ pesquisa, onSalvo }) {
  const [form, setForm] = useState(() => pesquisa
    ? { ...pesquisa, descricao: pesquisa.descricao ?? '', redirecionar_url: pesquisa.redirecionar_url ?? '', logo_url: pesquisa.logo_url ?? '',
        perguntas: pesquisa.perguntas.map((p) => ({ ...p, opcoesTexto: (p.opcoes ?? []).join('\n') })) }
    : { titulo: '', slug: '', descricao: '', texto_botao: 'Enviar respostas', redirecionar_url: '', logo_url: '', ativa: true,
        perguntas: [{ id: novoId(), tipo: 'texto', titulo: '', obrigatoria: true, opcoesTexto: '' }] })
  const [slugManual, setSlugManual] = useState(!!pesquisa)
  const [salvando, setSalvando] = useState(false)
  const campo = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const mudarTitulo = (e) => {
    const titulo = e.target.value
    setForm((f) => ({ ...f, titulo, slug: slugManual ? f.slug : paraSlug(titulo) }))
  }
  const mudarPergunta = (i, mudancas) => setForm((f) => ({ ...f, perguntas: f.perguntas.map((p, j) => (j === i ? { ...p, ...mudancas } : p)) }))
  const mover = (i, d) => setForm((f) => {
    const ps = [...f.perguntas]; const [x] = ps.splice(i, 1); ps.splice(i + d, 0, x); return { ...f, perguntas: ps }
  })
  const remover = (i) => setForm((f) => ({ ...f, perguntas: f.perguntas.filter((_, j) => j !== i) }))
  const adicionar = () => setForm((f) => ({ ...f, perguntas: [...f.perguntas, { id: novoId(), tipo: 'texto', titulo: '', obrigatoria: false, opcoesTexto: '' }] }))

  const problemas = useMemo(() => {
    const lista = []
    if (!form.titulo.trim()) lista.push('Informe o título.')
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) lista.push('O endereço só pode ter letras sem acento, números e hífens.')
    if (form.redirecionar_url.trim() && !/^https?:\/\//.test(form.redirecionar_url.trim())) lista.push('O redirecionamento precisa começar com https://')
    if (!form.perguntas.length) lista.push('Adicione pelo menos uma pergunta.')
    form.perguntas.forEach((p, i) => {
      if (!p.titulo.trim()) lista.push(`Pergunta ${i + 1}: escreva a pergunta.`)
      if (comOpcoes(p.tipo) && opcoes(p).length < 2) lista.push(`Pergunta ${i + 1}: coloque pelo menos 2 opções.`)
    })
    return lista
  }, [form])

  async function salvar(e) {
    e.preventDefault()
    if (problemas.length) return
    setSalvando(true)
    const perguntas = form.perguntas.map(({ id, tipo, titulo, obrigatoria, ...p }) => ({
      id, tipo, titulo: titulo.trim(), obrigatoria: !!obrigatoria, ...(comOpcoes(tipo) ? { opcoes: opcoes(p) } : {}),
    }))
    let novoIdPesquisa
    const ok = await tentar(async () => {
      const { data, error } = await supabase.rpc('impl_salvar_pesquisa', {
        p_id: pesquisa?.id ?? null, p_slug: form.slug, p_titulo: form.titulo, p_descricao: form.descricao, p_perguntas: perguntas,
        p_texto_botao: form.texto_botao, p_redirecionar_url: form.redirecionar_url, p_ativa: form.ativa,
        p_logo_url: form.logo_url || null,
      })
      if (error) throw new Error(error.message)
      novoIdPesquisa = data
    })
    setSalvando(false)
    if (ok) { await onSalvo(); window.location.hash = '/pesquisas'; if (!pesquisa && novoIdPesquisa) alert('Pesquisa criada. Copie o link na lista para divulgar.') }
  }

  async function excluir() {
    if (!confirm(`Excluir a pesquisa "${pesquisa.titulo}" e todas as ${pesquisa.respostas} resposta(s)? Isso não pode ser desfeito.`)) return
    const ok = await tentar(async () => {
      const { error } = await supabase.rpc('impl_excluir_pesquisa', { p_id: pesquisa.id })
      if (error) throw new Error(error.message)
    })
    if (ok) { await onSalvo(); window.location.hash = '/pesquisas' }
  }

  return (
    <>
      <a href="#/pesquisas" className="voltar">← Pesquisas</a>
      <header className="cabecalho">
        <div>
          <h1>{pesquisa ? 'Editar pesquisa' : 'Nova pesquisa'}</h1>
          {pesquisa && <p className="muted">{pesquisa.respostas} resposta(s) recebida(s). Mudar ou tirar perguntas não apaga as respostas antigas.</p>}
        </div>
        {pesquisa && <a className="btn" href={linkPesquisa(form.slug)} target="_blank" rel="noreferrer">Abrir a pesquisa ↗</a>}
      </header>

      <form className="editor-pesquisa" onSubmit={salvar}>
        <section className="cartao editor-pesquisa-bloco">
          <h2>Página</h2>
          <LogoPesquisa url={form.logo_url} onMudar={(logo_url) => setForm((f) => ({ ...f, logo_url }))} />
          <label>Título<input value={form.titulo} onChange={mudarTitulo} placeholder="Ex.: Pesquisa de satisfação da implantação" /></label>
          <label>Texto de apresentação (opcional)<textarea rows={3} value={form.descricao} onChange={campo('descricao')} placeholder="Aparece embaixo do título." /></label>
          <div className="linha-form">
            <label>Endereço da pesquisa
              <input value={form.slug} onChange={(e) => { setSlugManual(true); setForm((f) => ({ ...f, slug: paraSlug(e.target.value) })) }} />
              <span className="muted pequeno quebra">{linkPesquisa(form.slug || '…')}</span>
            </label>
            <label>Texto do botão<input value={form.texto_botao} onChange={campo('texto_botao')} /></label>
          </div>
          <label>Depois de enviar, levar para (opcional)
            <input value={form.redirecionar_url} onChange={campo('redirecionar_url')} placeholder="https://www.hsystem.com.br/obrigado" />
            <span className="muted pequeno">Se ficar vazio, aparece uma mensagem de agradecimento.</span>
          </label>
          <label className="check-filtro">
            <input type="checkbox" checked={form.ativa} onChange={(e) => setForm((f) => ({ ...f, ativa: e.target.checked }))} />
            Pesquisa ativa (quando desmarcada, o link mostra "Pesquisa não encontrada")
          </label>
        </section>

        <section className="editor-pesquisa-perguntas">
          <h2>Perguntas</h2>
          {form.perguntas.map((p, i) => (
            <div key={p.id} className="cartao editor-pergunta">
              <div className="editor-pergunta-topo">
                <b>Pergunta {i + 1}</b>
                <div className="acoes">
                  <button type="button" className="btn pequeno fantasma" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir a pergunta ${i + 1}`}>↑</button>
                  <button type="button" className="btn pequeno fantasma" onClick={() => mover(i, 1)} disabled={i === form.perguntas.length - 1} aria-label={`Descer a pergunta ${i + 1}`}>↓</button>
                  <button type="button" className="btn pequeno fantasma" onClick={() => remover(i)} disabled={form.perguntas.length === 1}>Remover</button>
                </div>
              </div>
              <label>Pergunta<input value={p.titulo} onChange={(e) => mudarPergunta(i, { titulo: e.target.value })} /></label>
              <div className="linha-form">
                <label>Tipo
                  <select value={p.tipo} onChange={(e) => mudarPergunta(i, { tipo: e.target.value })}>
                    {Object.entries(TIPOS).map(([t, r]) => <option key={t} value={t}>{r}</option>)}
                  </select>
                </label>
                <label className="check-filtro">
                  <input type="checkbox" checked={!!p.obrigatoria} onChange={(e) => mudarPergunta(i, { obrigatoria: e.target.checked })} />
                  Obrigatória
                </label>
              </div>
              {comOpcoes(p.tipo) && (
                <label>Opções (uma por linha)
                  <textarea rows={4} value={p.opcoesTexto} onChange={(e) => mudarPergunta(i, { opcoesTexto: e.target.value })} placeholder={'Sim\nNão\nTalvez'} />
                </label>
              )}
            </div>
          ))}
          <button type="button" className="btn" onClick={adicionar}>+ Adicionar pergunta</button>
        </section>

        {problemas.length > 0 && (
          <div className="alerta aviso-analista" role="status"><b>Antes de salvar:</b><ul>{problemas.map((x) => <li key={x}>{x}</li>)}</ul></div>
        )}
        <div className="acoes">
          <button className="btn primario" disabled={salvando || problemas.length > 0}>{salvando ? 'Salvando…' : 'Salvar pesquisa'}</button>
          {pesquisa && <button type="button" className="btn fantasma" onClick={excluir}>Excluir pesquisa</button>}
        </div>
      </form>
    </>
  )
}

// Logo da página pública: envia a imagem para o Storage (bucket "pesquisas") e guarda o endereço público.
const TIPOS_LOGO = ['image/png', 'image/jpeg', 'image/webp']
function LogoPesquisa({ url, onMudar }) {
  const [enviando, setEnviando] = useState(false)
  async function escolher(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    if (!TIPOS_LOGO.includes(arquivo.type)) { alert('Use uma imagem PNG, JPG ou WEBP.'); return }
    if (arquivo.size > 2 * 1024 * 1024) { alert('A imagem precisa ter até 2 MB.'); return }
    setEnviando(true)
    await tentar(async () => {
      const ext = arquivo.type.split('/')[1].replace('jpeg', 'jpg')
      const caminho = `logos/${Date.now()}-${novoId()}.${ext}`
      const { error } = await supabase.storage.from('pesquisas').upload(caminho, arquivo, { contentType: arquivo.type, cacheControl: '31536000' })
      if (error) throw new Error(error.message)
      onMudar(supabase.storage.from('pesquisas').getPublicUrl(caminho).data.publicUrl)
    })
    setEnviando(false)
  }
  return (
    <div className="logo-pesquisa">
      <span className="logo-pesquisa-rotulo">Logo da página</span>
      <div className="logo-pesquisa-linha">
        <div className="logo-pesquisa-previa">
          {url ? <img src={url} alt="Logo escolhido" /> : <div className="login-marca"><img src="./logo.png" alt="Logo padrão do HSystem Academy" /></div>}
        </div>
        <div className="logo-pesquisa-acoes">
          <label className="btn pequeno logo-pesquisa-botao">
            {enviando ? 'Enviando…' : url ? 'Trocar logo' : 'Enviar logo'}
            <input type="file" accept={TIPOS_LOGO.join(',')} onChange={escolher} disabled={enviando} className="sr-only" />
          </label>
          {url && <button type="button" className="btn pequeno fantasma" onClick={() => onMudar('')}>Usar o logo padrão</button>}
          <span className="muted pequeno">{url ? 'Logo próprio desta pesquisa.' : 'Usando o logo padrão do HSystem Academy.'} PNG, JPG ou WEBP, até 2 MB. Vale depois de salvar.</span>
        </div>
      </div>
    </div>
  )
}

const opcoes = (p) => [...new Set((p.opcoesTexto ?? (p.opcoes ?? []).join('\n')).split('\n').map((o) => o.trim()).filter(Boolean))]

function Respostas({ pesquisa }) {
  const [linhas, setLinhas] = useState(null)
  useEffect(() => {
    supabase.from('impl_respostas').select('id, respostas, parametros, criado_em').eq('pesquisa_id', pesquisa.id)
      .order('criado_em', { ascending: false }).then(({ data, error }) => setLinhas(error ? [] : data))
  }, [pesquisa.id])

  const texto = (v) => (Array.isArray(v) ? v.join('; ') : v ?? '')
  const chavesParametros = useMemo(() => [...new Set((linhas ?? []).flatMap((l) => Object.keys(l.parametros ?? {})))], [linhas])

  function baixar() {
    const cabeca = ['Data', ...pesquisa.perguntas.map((p) => p.titulo), ...chavesParametros]
    const corpo = linhas.map((l) => [fmtDataHora(l.criado_em), ...pesquisa.perguntas.map((p) => texto(l.respostas[p.id])), ...chavesParametros.map((k) => l.parametros?.[k] ?? '')])
    const csv = [cabeca, ...corpo].map((linha) => linha.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `respostas-${pesquisa.slug}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <a href="#/pesquisas" className="voltar">← Pesquisas</a>
      <header className="cabecalho">
        <div>
          <h1>Respostas: {pesquisa.titulo}</h1>
          <p className="muted">{linhas ? `${linhas.length} resposta(s), da mais recente para a mais antiga.` : 'Carregando…'}</p>
        </div>
        {linhas?.length > 0 && <button className="btn" onClick={baixar}>Baixar planilha (CSV)</button>}
      </header>
      {linhas && linhas.length === 0 && <div className="cartao vazio-cartao"><p className="muted">Ainda não há respostas. Divulgue o link: {linkPesquisa(pesquisa.slug)}</p></div>}
      {linhas?.length > 0 && (
        <div className="cartao tabela-cartao">
          <table className="tabela tabela-acessos">
            <thead><tr><th>Data</th>{pesquisa.perguntas.map((p) => <th key={p.id}>{p.titulo}</th>)}</tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td className="sem-quebra">{fmtDataHora(l.criado_em)}</td>
                  {pesquisa.perguntas.map((p) => <td key={p.id}>{texto(l.respostas[p.id]) || <span className="muted">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
