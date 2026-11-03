import { useEffect, useMemo, useRef, useState } from 'react'
import { criarAcesso, atualizarAcesso, removerAcesso, enviarConvite } from '../dados.js'
import { tentar, fmtData } from '../comum.jsx'
import { Icone } from '../icones.jsx'
import { analistasPendentes } from './Sensedata.jsx'

// Acessos (só admin): quem entra no Academy. Lista com abas e busca; criar e editar num painel lateral.
// Os analistas ficam aqui também (Calendly e hotéis), e os CS do Sensedata ainda não cadastrados aparecem num aviso.
export const PERFIS = {
  admin: { rotulo: 'Admin', plural: 'Admins', descricao: 'Acesso a tudo, inclusive criar acessos.' },
  analista: { rotulo: 'Analista', plural: 'Analistas', descricao: 'Vê o dashboard e os hotéis dele.' },
  cliente: { rotulo: 'Cliente', plural: 'Clientes', descricao: 'Vê a implantação do próprio hotel.' },
}
const ORDEM = Object.keys(PERFIS)
const normal = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// restrito (analista): só os usuários cliente dos hotéis dele; pode criar cliente e enviar convite, sem editar nem remover.
export default function Acessos({ estado, euId, filtroInicial = 'todos', restrito = false }) {
  const [filtro, setFiltro] = useState(restrito ? 'cliente' : filtroInicial)
  const [busca, setBusca] = useState('')
  const [painel, setPainel] = useState(null) // null | { novo: true, inicial? } | { id }
  const nomeHotel = (id) => estado.hoteis.find((h) => h.id === id)?.nome ?? '—'
  const hoteisDoAnalista = (id) => estado.hoteis.filter((h) => h.analistaId === id).length
  const pendentes = restrito ? [] : analistasPendentes(estado)
  const meusHoteis = new Set(estado.hoteis.filter((h) => h.analistaId === euId).map((h) => h.id))

  const lista = useMemo(() => {
    const termo = normal(busca.trim())
    return estado.usuarios
      .filter((u) => !restrito || (u.perfil === 'cliente' && meusHoteis.has(u.hotelId)))
      .filter((u) => filtro === 'todos' || u.perfil === filtro)
      .filter((u) => !termo || normal(`${u.nome} ${u.email} ${u.hotelId ? nomeHotel(u.hotelId) : ''}`).includes(termo))
      .sort((a, b) => ORDEM.indexOf(a.perfil) - ORDEM.indexOf(b.perfil) || a.nome.localeCompare(b.nome))
  }, [estado, filtro, busca])

  const contagem = (p) => (p === 'todos' ? estado.usuarios.length : estado.usuarios.filter((u) => u.perfil === p).length)
  const vinculo = (u) => u.perfil === 'cliente' ? nomeHotel(u.hotelId)
    : u.perfil === 'analista' ? `${hoteisDoAnalista(u.id)} ${hoteisDoAnalista(u.id) === 1 ? 'hotel' : 'hotéis'}` : '—'
  const selecionado = painel?.id ? estado.usuarios.find((u) => u.id === painel.id) : null

  return (
    <>
      <header className="cabecalho acessos-cabecalho">
        <div>
          <h1>Acessos</h1>
          <p className="muted">{restrito
            ? 'Usuários dos seus hotéis. Crie o acesso de um cliente quando ele não vier certo do Sensedata.'
            : 'Quem entra no HSystem Academy e o que cada um vê.'}</p>
        </div>
        <button className="btn primario" onClick={() => setPainel({ novo: true })}><span aria-hidden="true">+</span> {restrito ? 'Novo usuário cliente' : 'Novo acesso'}</button>
      </header>

      <div className="acessos-barra">
        {!restrito && <div className="abas" role="tablist" aria-label="Filtrar por perfil">
          {['todos', ...ORDEM].map((p) => (
            <button key={p} type="button" role="tab" aria-selected={filtro === p} className={filtro === p ? 'ativa' : ''} onClick={() => setFiltro(p)}>
              {p === 'todos' ? 'Todos' : PERFIS[p].plural} <span className="abas-numero">{contagem(p)}</span>
            </button>
          ))}
        </div>}
        <label className="acessos-busca">
          <span className="sr-only">Buscar por nome, e-mail ou hotel</span>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, e-mail ou hotel" />
        </label>
      </div>

      {pendentes.length > 0 && <AvisoPendentes pendentes={pendentes} onCadastrar={(p) => setPainel({ novo: true, inicial: { nome: p.nome, email: p.email, perfil: 'analista' } })} />}

      <div className="cartao tabela-cartao">
        {lista.length === 0 ? (
          <p className="muted acessos-vazio">Ninguém encontrado{busca ? ` para "${busca}"` : ''}.</p>
        ) : (
          <table className="tabela tabela-limpa">
            <thead><tr><th>Nome</th><th>Perfil</th><th>Vínculo</th><th>Convite</th><th><span className="sr-only">Abrir</span></th></tr></thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} onClick={() => setPainel({ id: u.id })}>
                  <td>
                    <button type="button" className="acessos-nome" onClick={(e) => { e.stopPropagation(); setPainel({ id: u.id }) }}>
                      <b>{u.nome}</b><span className="muted pequeno">{u.email}</span>
                    </button>
                  </td>
                  <td><span className={`perfil-marca perfil-${u.perfil}`}>{PERFIS[u.perfil]?.rotulo ?? u.perfil}</span></td>
                  <td className="muted">{vinculo(u)}</td>
                  <td>{u.convidadoEm ? <span className="muted">Enviado {fmtData(u.convidadoEm).slice(0, 5)}</span> : <span className="convite-pendente">Não enviado</span>}</td>
                  <td className="acessos-seta" aria-hidden="true">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {painel && (
        <PainelAcesso key={painel.id ?? 'novo'} estado={estado} euId={euId} restrito={restrito} usuario={selecionado} inicial={painel.inicial}
          hoteisDoAnalista={selecionado ? hoteisDoAnalista(selecionado.id) : 0} onFechar={() => setPainel(null)} />
      )}
    </>
  )
}

function AvisoPendentes({ pendentes, onCadastrar }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="aviso-linha">
      <span><b>{pendentes.length} {pendentes.length === 1 ? 'analista do Sensedata ainda não cadastrado' : 'analistas do Sensedata ainda não cadastrados'}</b> · os hotéis deles ficam sem analista até o cadastro.</span>
      <button type="button" className="link pequeno" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>{aberto ? 'Ocultar' : 'Ver'}</button>
      {aberto && (
        <ul className="aviso-linha-lista">
          {pendentes.map((p) => (
            <li key={p.email}>
              <span>{p.nome} <span className="muted pequeno">· {p.email} · {p.hoteis.length} {p.hoteis.length === 1 ? 'hotel' : 'hotéis'}</span></span>
              <button type="button" className="btn pequeno" onClick={() => onCadastrar(p)}>Cadastrar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const calendlyValido = (url) => !url.trim() || /^https:\/\/calendly\.com\/[\w-]+/.test(url.trim())

// Painel lateral: cria um acesso novo ou edita/remove um existente.
function PainelAcesso({ estado, euId, restrito, usuario, inicial, hoteisDoAnalista, onFechar }) {
  const novo = !usuario
  const [form, setForm] = useState(() => usuario
    ? { nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, hotelId: usuario.hotelId ?? '', calendly: usuario.calendly ?? '' }
    : { nome: '', email: '', perfil: restrito ? 'cliente' : 'analista', hotelId: '', calendly: '', ...inicial })
  const [convidar, setConvidar] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const caixa = useRef(null)
  const campo = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const hoteis = estado.hoteis.filter((h) => !restrito || h.analistaId === euId).sort((a, b) => a.nome.localeCompare(b.nome))
  const soLeitura = restrito && !novo
  const souEu = !!usuario && usuario.id === euId

  useEffect(() => {
    caixa.current?.querySelector('input, select')?.focus()
    const tecla = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const mudou = novo || ['nome', 'email', 'perfil', 'hotelId', 'calendly'].some((k) => (form[k] ?? '') !== ((k === 'hotelId' ? usuario.hotelId : usuario[k]) ?? ''))
  const pode = form.nome.trim() && form.email.trim() && (form.perfil !== 'cliente' || form.hotelId) && calendlyValido(form.calendly)

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    if (novo) {
      let id
      const ok = await tentar(async () => { id = await criarAcesso(form) })
      if (ok && convidar && id) {
        if (await tentar(() => enviarConvite(id))) alert(`Acesso criado e convite enviado para ${form.email.trim()}.`)
      }
      setSalvando(false)
      if (ok) onFechar()
      return
    }
    const ok = await tentar(() => atualizarAcesso(usuario.id, form))
    setSalvando(false)
    if (ok) onFechar()
  }

  async function remover() {
    const extra = usuario.perfil === 'analista' && hoteisDoAnalista ? ` Os ${hoteisDoAnalista} hotel(éis) dele ficam sem analista.` : ''
    if (!confirm(`Remover o acesso de ${usuario.nome}? A pessoa deixa de entrar no Academy.${extra} O progresso dos hotéis não é apagado.`)) return
    if (await tentar(() => removerAcesso(usuario.id))) onFechar()
  }

  const emailMudou = !novo && form.email.trim().toLowerCase() !== usuario.email

  return (
    <div className="painel-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <aside className="painel-lateral" role="dialog" aria-modal="true" aria-labelledby="painel-titulo" ref={caixa}>
        <header className="painel-topo">
          <div>
            <h2 id="painel-titulo">{novo ? (restrito ? 'Novo usuário cliente' : 'Novo acesso') : usuario.nome}</h2>
            {!novo && <span className="muted pequeno">{PERFIS[usuario.perfil]?.rotulo}{usuario.perfil === 'analista' ? ` · ${hoteisDoAnalista} ${hoteisDoAnalista === 1 ? 'hotel' : 'hotéis'}` : ''}</span>}
          </div>
          <button type="button" className="painel-fechar" onClick={onFechar} aria-label="Fechar"><Icone nome="fechar" /></button>
        </header>

        <form className="painel-corpo" onSubmit={salvar} id="form-acesso">
          {soLeitura ? (
            <dl className="painel-dados">
              <div><dt>E-mail</dt><dd>{usuario.email}</dd></div>
              <div><dt>Hotel</dt><dd>{estado.hoteis.find((h) => h.id === usuario.hotelId)?.nome ?? '—'}</dd></div>
              <p className="muted pequeno">Para corrigir nome ou e-mail, fale com um admin.</p>
            </dl>
          ) : <>
          {!restrito && (
            <label>Perfil
              <select value={form.perfil} onChange={campo('perfil')} disabled={souEu}>
                {ORDEM.map((p) => <option key={p} value={p}>{PERFIS[p].rotulo}</option>)}
              </select>
              <span className="muted pequeno">{souEu ? 'Você não pode mudar o seu próprio perfil.' : PERFIS[form.perfil].descricao}</span>
            </label>
          )}
          <label>Nome<input required value={form.nome} onChange={campo('nome')} autoComplete="off" /></label>
          <label>E-mail
            <input type="email" required value={form.email} onChange={campo('email')} autoComplete="off" />
            {emailMudou && <span className="aviso-campo">Com o e-mail novo, a pessoa precisa de um novo convite para entrar.</span>}
          </label>
          {form.perfil === 'cliente' && (
            <label>Hotel
              <select required value={form.hotelId} onChange={campo('hotelId')}>
                <option value="">Escolha o hotel</option>
                {hoteis.map((h) => <option key={h.id} value={h.id}>{h.nome}{h.teste && !h.nome.includes('(teste)') ? ' (teste)' : ''}</option>)}
              </select>
            </label>
          )}
          {form.perfil === 'analista' && (
            <label>Link do Calendly (opcional)
              <input value={form.calendly} onChange={campo('calendly')} placeholder="https://calendly.com/nome/reuniao" />
              {!calendlyValido(form.calendly)
                ? <span className="erro-campo">Use um link que comece com https://calendly.com/</span>
                : <span className="muted pequeno">Aparece para os clientes dele na hora de agendar as reuniões.</span>}
            </label>
          )}
          {novo && (
            <label className="check-linha">
              <input type="checkbox" checked={convidar} onChange={(e) => setConvidar(e.target.checked)} />
              Enviar o convite por e-mail agora
            </label>
          )}
          </>}

          {!novo && (
            <section className="painel-secao">
              <h3>Convite</h3>
              <p className="muted pequeno">{usuario.convidadoEm ? `Enviado em ${fmtData(usuario.convidadoEm)}.` : 'Ainda não enviado. A pessoa só consegue entrar depois de criar a senha pelo convite.'}</p>
              <BotaoConvite usuario={usuario} />
            </section>
          )}
        </form>

        <footer className="painel-rodape">
          {!novo && !souEu && !restrito && <button type="button" className="btn fantasma painel-remover" onClick={remover}>Remover acesso</button>}
          <span className="painel-rodape-acoes">
            <button type="button" className="btn fantasma" onClick={onFechar}>{soLeitura ? 'Fechar' : 'Cancelar'}</button>
            {!soLeitura && (
              <button type="submit" form="form-acesso" className="btn primario" disabled={!pode || !mudou || salvando}>
                {salvando ? 'Salvando…' : novo ? 'Criar acesso' : 'Salvar'}
              </button>
            )}
          </span>
        </footer>
      </aside>
    </div>
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
      ? `${usuario.email} já tinha login: enviamos o link para definir a senha.`
      : `Convite enviado para ${usuario.email}.`)
  }
  return (
    <button type="button" className="btn pequeno" onClick={enviar} disabled={enviando}>
      {enviando ? 'Enviando…' : usuario.convidadoEm ? 'Reenviar convite' : 'Enviar convite'}
    </button>
  )
}
