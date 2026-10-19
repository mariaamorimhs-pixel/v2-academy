import { useState } from 'react'
import { salvarAnalista, enviarConvite } from '../dados.js'
import { tentar, fmtData } from '../comum.jsx'
import { analistasPendentes } from './Sensedata.jsx'

// Analistas cadastrados pela editora, com o link do Calendly que aparece para os clientes de cada um.
export default function Analistas({ estado }) {
  const analistas = estado.usuarios.filter((u) => u.perfil === 'analista').sort((a, b) => a.nome.localeCompare(b.nome))
  return (
    <>
      <header className="cabecalho">
        <div>
          <h1>Analistas</h1>
          <p className="muted">O link do Calendly de cada analista aparece na tela de agendamento dos hotéis dele. Depois de cadastrar, envie o convite para a pessoa criar a senha.</p>
        </div>
      </header>
      <div className="cartao">
        {analistas.map((a) => <LinhaAnalista key={a.id} analista={a} hoteis={estado.hoteis.filter((h) => h.analistaId === a.id).length} />)}
      </div>
      <Pendentes estado={estado} />
      <NovoAnalista />
    </>
  )
}

const calendlyValido = (url) => !url.trim() || /^https:\/\/calendly\.com\/[\w-]+/.test(url.trim())

function LinhaAnalista({ analista, hoteis }) {
  const [url, setUrl] = useState(analista.calendly ?? '')
  const mudou = url.trim() !== (analista.calendly ?? '')
  return (
    <form className="linha-analista" onSubmit={(e) => { e.preventDefault(); tentar(() => salvarAnalista(analista.id, analista.nome, analista.email, url)) }}>
      <div>
        <b>{analista.nome}</b>
        <p className="muted pequeno">{analista.email} · {hoteis} {hoteis === 1 ? 'hotel' : 'hotéis'}</p>
        <BotaoConvite usuario={analista} />
      </div>
      <label>
        Link do Calendly
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://calendly.com/nome/reuniao" />
        {!calendlyValido(url) && <span className="erro-campo">Use um link que comece com https://calendly.com/</span>}
      </label>
      <button className="btn" disabled={!mudou || !calendlyValido(url)}>Salvar</button>
    </form>
  )
}

function NovoAnalista() {
  const [form, setForm] = useState({ nome: '', email: '', calendly: '' })
  const campo = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  async function cadastrar(e) {
    e.preventDefault()
    if (await tentar(() => salvarAnalista(null, form.nome, form.email, form.calendly))) setForm({ nome: '', email: '', calendly: '' })
  }
  return (
    <form className="cartao novo-analista" onSubmit={cadastrar}>
      <h2>Cadastrar analista</h2>
      <div className="linha-form">
        <label>Nome<input required value={form.nome} onChange={campo('nome')} /></label>
        <label>E-mail<input type="email" required value={form.email} onChange={campo('email')} /></label>
        <label>Link do Calendly (opcional)<input value={form.calendly} onChange={campo('calendly')} placeholder="https://calendly.com/…" /></label>
        <button className="btn primario" disabled={!calendlyValido(form.calendly)}>Cadastrar</button>
      </div>
    </form>
  )
}

// Envia (ou reenvia) o convite de primeiro acesso por e-mail.
export function BotaoConvite({ usuario }) {
  const [enviando, setEnviando] = useState(false)
  async function enviar() {
    if (!confirm(`Enviar um e-mail para ${usuario.email} criar a senha de acesso?`)) return
    setEnviando(true)
    let tipo
    const ok = await tentar(async () => { tipo = (await enviarConvite(usuario.id))?.tipo })
    setEnviando(false)
    if (ok) alert(tipo === 'redefinir-senha'
      ? `${usuario.email} já tinha login no Supabase: enviamos o link para definir a senha.`
      : `Convite enviado para ${usuario.email}.`)
  }
  return (
    <span className="convite">
      {usuario.convidadoEm && <span className="muted pequeno">Convidado em {fmtData(usuario.convidadoEm)}</span>}
      <button type="button" className="link pequeno" onClick={enviar} disabled={enviando}>
        {enviando ? 'Enviando…' : usuario.convidadoEm ? 'Reenviar convite' : 'Enviar convite'}
      </button>
    </span>
  )
}

// Analistas que aparecem como CS no Sensedata mas ainda não estão cadastrados: cadastro em um clique
// (os hotéis deles passam a ser deles na hora).
function Pendentes({ estado }) {
  const pendentes = analistasPendentes(estado)
  const [cadastrando, setCadastrando] = useState(null)
  if (!pendentes.length) return null
  async function cadastrar(p) {
    setCadastrando(p.email)
    await tentar(() => salvarAnalista(null, p.nome, p.email, ''))
    setCadastrando(null)
  }
  return (
    <section className="cartao pendentes-analistas">
      <h2>Vindos do Sensedata, ainda não cadastrados</h2>
      <p className="muted pequeno">São os CS dos hotéis sincronizados. Cadastre para que eles vejam seus hotéis; depois envie o convite.</p>
      <ul className="lista-simples">
        {pendentes.map((p) => (
          <li key={p.email}>
            <span><b>{p.nome}</b><br /><span className="muted pequeno">{p.email} · {p.hoteis.length} hotel(éis): {p.hoteis.slice(0, 3).join(', ')}{p.hoteis.length > 3 ? '…' : ''}</span></span>
            <button className="btn" onClick={() => cadastrar(p)} disabled={cadastrando === p.email}>{cadastrando === p.email ? 'Cadastrando…' : 'Cadastrar'}</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
