import { useMemo, useState } from 'react'
import { criarAcesso, enviarConvite } from '../dados.js'
import { tentar } from '../comum.jsx'
import { BotaoConvite } from './Analistas.jsx'

// Níveis de acesso (só admin): lista quem entra no Academy e cria novos acessos.
export const PERFIS = {
  admin: { rotulo: 'Admin', descricao: 'Acesso a tudo, inclusive criar acessos.' },
  analista: { rotulo: 'Analista', descricao: 'Vê o dashboard e os hotéis dele.' },
  cliente: { rotulo: 'Usuário de cliente', descricao: 'Vê a implantação do próprio hotel.' },
}

export default function Acessos({ estado }) {
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const nomeHotel = (id) => estado.hoteis.find((h) => h.id === id)?.nome ?? '—'

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return estado.usuarios
      .filter((u) => filtro === 'todos' || u.perfil === filtro)
      .filter((u) => !termo || [u.nome, u.email, u.hotelId && nomeHotel(u.hotelId)].some((t) => t?.toLowerCase().includes(termo)))
      .sort((a, b) => Object.keys(PERFIS).indexOf(a.perfil) - Object.keys(PERFIS).indexOf(b.perfil) || a.nome.localeCompare(b.nome))
  }, [estado, filtro, busca])

  const contagem = (p) => estado.usuarios.filter((u) => u.perfil === p).length

  return (
    <>
      <header className="cabecalho">
        <div>
          <h1>Acessos</h1>
          <p className="muted">Quem entra no HSystem Academy e o que cada um vê. Depois de criar, envie o convite para a pessoa criar a senha.</p>
        </div>
      </header>

      <NovoAcesso estado={estado} />

      <div className="filtros-acessos">
        <div className="segmentos" role="group" aria-label="Filtrar por perfil">
          {['todos', ...Object.keys(PERFIS)].map((p) => (
            <button key={p} type="button" className={filtro === p ? 'ativo' : ''} aria-pressed={filtro === p} onClick={() => setFiltro(p)}>
              {p === 'todos' ? `Todos (${estado.usuarios.length})` : `${PERFIS[p].rotulo} (${contagem(p)})`}
            </button>
          ))}
        </div>
        <label className="busca-acessos">
          <span className="sr-only">Buscar por nome, e-mail ou hotel</span>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, e-mail ou hotel" />
        </label>
      </div>

      <div className="cartao tabela-cartao">
        {lista.length === 0 ? (
          <p className="muted vazio-cartao">Ninguém encontrado.</p>
        ) : (
          <table className="tabela tabela-acessos">
            <thead><tr><th>Nome</th><th>Perfil</th><th>Hotel</th><th>Convite</th></tr></thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.nome}</b><br /><span className="muted pequeno">{u.email}</span></td>
                  <td><span className={`selo perfil-${u.perfil}`}>{PERFIS[u.perfil]?.rotulo ?? u.perfil}</span></td>
                  <td>{u.perfil === 'cliente' ? nomeHotel(u.hotelId) : <span className="muted">—</span>}</td>
                  <td><BotaoConvite usuario={u} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function NovoAcesso({ estado }) {
  const vazio = { nome: '', email: '', perfil: 'analista', hotelId: '' }
  const [form, setForm] = useState(vazio)
  const [convidar, setConvidar] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const campo = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const hoteis = [...estado.hoteis].sort((a, b) => a.nome.localeCompare(b.nome))

  async function criar(e) {
    e.preventDefault()
    setSalvando(true)
    let id
    const ok = await tentar(async () => { id = await criarAcesso(form) })
    if (ok && convidar && id) {
      const enviado = await tentar(() => enviarConvite(id))
      if (enviado) alert(`Acesso criado e convite enviado para ${form.email.trim()}.`)
    } else if (ok) alert('Acesso criado. Envie o convite pela lista quando quiser.')
    setSalvando(false)
    if (ok) setForm(vazio)
  }

  return (
    <form className="cartao novo-acesso" onSubmit={criar}>
      <h2>Criar acesso</h2>
      <fieldset className="perfis-opcoes">
        <legend>Perfil</legend>
        {Object.entries(PERFIS).map(([p, info]) => (
          <label key={p} className={`perfil-opcao ${form.perfil === p ? 'ativo' : ''}`}>
            <input type="radio" name="perfil" value={p} checked={form.perfil === p} onChange={campo('perfil')} />
            <span><b>{info.rotulo}</b><span className="muted pequeno">{info.descricao}</span></span>
          </label>
        ))}
      </fieldset>
      <div className="linha-form">
        <label>Nome<input required value={form.nome} onChange={campo('nome')} autoComplete="off" /></label>
        <label>E-mail<input type="email" required value={form.email} onChange={campo('email')} autoComplete="off" /></label>
        {form.perfil === 'cliente' && (
          <label>Hotel
            <select required value={form.hotelId} onChange={campo('hotelId')}>
              <option value="">Escolha o hotel</option>
              {hoteis.map((h) => <option key={h.id} value={h.id}>{h.nome}{h.teste ? ' (teste)' : ''}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="acoes">
        <label className="check-filtro">
          <input type="checkbox" checked={convidar} onChange={(e) => setConvidar(e.target.checked)} />
          Enviar o convite por e-mail agora
        </label>
        <button className="btn primario" disabled={salvando}>{salvando ? 'Criando…' : 'Criar acesso'}</button>
      </div>
    </form>
  )
}
