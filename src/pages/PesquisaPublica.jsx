import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

// Pesquisa pública (abre sem login): #/pesquisa/<endereço>. Respostas anônimas; ao enviar, leva a pessoa para o
// endereço configurado na pesquisa (ou mostra um agradecimento). Os parâmetros do link (ex.: ?utm_source=…)
// são guardados junto com a resposta.
export default function PesquisaPublica({ slug }) {
  const [pesquisa, setPesquisa] = useState(undefined) // undefined = carregando, null = não encontrada
  const [respostas, setRespostas] = useState({})
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState(null)
  const [enviada, setEnviada] = useState(false)

  useEffect(() => {
    supabase.rpc('impl_pesquisa_publica', { p_slug: slug }).then(({ data, error }) => {
      setPesquisa(error ? null : data)
      if (data?.titulo) document.title = data.titulo
    })
  }, [slug])

  if (pesquisa === undefined) return <div className="centro muted">Carregando…</div>
  if (!pesquisa) return <Moldura><h1>Pesquisa não encontrada</h1><p className="muted">Este link não está disponível. Confira o endereço com quem te enviou.</p></Moldura>
  if (enviada) return <Moldura logo={pesquisa.logo_url}><h1>Obrigado!</h1><p className="muted">Suas respostas foram enviadas.</p></Moldura>

  const definir = (id, valor) => { setRespostas((r) => ({ ...r, [id]: valor })); setErros((e) => ({ ...e, [id]: null })) }
  const alternar = (id, opcao) => {
    const atual = respostas[id] ?? []
    definir(id, atual.includes(opcao) ? atual.filter((o) => o !== opcao) : [...atual, opcao])
  }

  async function enviar(e) {
    e.preventDefault()
    const faltando = {}
    for (const p of pesquisa.perguntas) {
      const v = respostas[p.id]
      const vazio = v == null || (Array.isArray(v) ? v.length === 0 : !String(v).trim())
      if (p.obrigatoria && vazio) faltando[p.id] = 'Responda esta pergunta.'
    }
    setErros(faltando)
    const primeira = Object.keys(faltando)[0]
    if (primeira) { document.getElementById(`p-${primeira}`)?.focus(); return }

    setEnviando(true)
    setErroEnvio(null)
    const noHash = window.location.hash.split('?')[1] ?? ''
    const parametros = Object.fromEntries([...new URLSearchParams(window.location.search), ...new URLSearchParams(noHash)])
    const { error } = await supabase.rpc('impl_responder_pesquisa', {
      p_slug: slug, p_respostas: respostas, p_parametros: Object.keys(parametros).length ? parametros : null,
    })
    if (error) { setEnviando(false); setErroEnvio(error.message); return }
    if (pesquisa.redirecionar_url) window.location.assign(pesquisa.redirecionar_url)
    else { setEnviando(false); setEnviada(true) }
  }

  return (
    <Moldura logo={pesquisa.logo_url}>
      <h1>{pesquisa.titulo}</h1>
      {pesquisa.descricao && <p className="pesquisa-descricao">{pesquisa.descricao}</p>}
      <form className="pesquisa-form" onSubmit={enviar} noValidate>
        {pesquisa.perguntas.map((p, i) => (
          <Pergunta key={p.id} p={p} numero={i + 1} valor={respostas[p.id]} erro={erros[p.id]}
            onTexto={(v) => definir(p.id, v)} onUma={(o) => definir(p.id, o)} onVarias={(o) => alternar(p.id, o)} />
        ))}
        {erroEnvio && <div className="alerta erro" role="alert">Não foi possível enviar: {erroEnvio}</div>}
        <button className="btn primario pesquisa-enviar" disabled={enviando}>{enviando ? 'Enviando…' : pesquisa.texto_botao}</button>
      </form>
    </Moldura>
  )
}

function Pergunta({ p, numero, valor, erro, onTexto, onUma, onVarias }) {
  const rotulo = <>{numero}. {p.titulo}{p.obrigatoria ? <span className="obrigatoria" aria-hidden="true"> *</span> : <span className="muted pequeno"> (opcional)</span>}</>
  const idErro = erro ? `e-${p.id}` : undefined
  if (p.tipo === 'texto' || p.tipo === 'texto_longo') {
    const Campo = p.tipo === 'texto' ? 'input' : 'textarea'
    return (
      <div className="pesquisa-pergunta">
        <label htmlFor={`p-${p.id}`} className="pesquisa-rotulo">{rotulo}</label>
        <Campo id={`p-${p.id}`} value={valor ?? ''} onChange={(e) => onTexto(e.target.value)} rows={p.tipo === 'texto' ? undefined : 4}
          aria-required={p.obrigatoria || undefined} aria-invalid={!!erro || undefined} aria-describedby={idErro} />
        {erro && <span id={idErro} className="erro-campo">{erro}</span>}
      </div>
    )
  }
  const varias = p.tipo === 'escolha_varias'
  return (
    <fieldset className="pesquisa-pergunta" aria-required={p.obrigatoria || undefined} aria-invalid={!!erro || undefined} aria-describedby={idErro}>
      <legend className="pesquisa-rotulo">{rotulo}{varias && <span className="muted pequeno"> · pode marcar mais de uma</span>}</legend>
      <div className="pesquisa-opcoes">
        {(p.opcoes ?? []).map((o, i) => {
          const marcada = varias ? (valor ?? []).includes(o) : valor === o
          return (
            <label key={o} className={`pesquisa-opcao ${marcada ? 'ativo' : ''}`}>
              <input id={i === 0 ? `p-${p.id}` : undefined} type={varias ? 'checkbox' : 'radio'} name={`p-${p.id}`} checked={marcada}
                onChange={() => (varias ? onVarias(o) : onUma(o))} />
              <span>{o}</span>
            </label>
          )
        })}
      </div>
      {erro && <span id={idErro} className="erro-campo">{erro}</span>}
    </fieldset>
  )
}

// Logo da pesquisa (enviado no editor) ou, sem ele, o do HSystem Academy.
function Moldura({ logo, children }) {
  return (
    <div className="pesquisa-pagina">
      <main className="pesquisa-cartao cartao">
        {logo
          ? <div className="pesquisa-logo pesquisa-logo-proprio"><img src={logo} alt="Logo" /></div>
          : <div className="login-marca pesquisa-logo"><img src="./logo.png" alt="HSystem" /></div>}
        {children}
      </main>
    </div>
  )
}
