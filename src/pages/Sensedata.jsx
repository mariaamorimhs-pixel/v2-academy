import { useState } from 'react'
import { fmtDataHora, tentar } from '../comum.jsx'
import { sincronizarSensedata } from '../dados.js'

// Analistas do Sensedata (campo CS dos clientes) que ainda não estão cadastrados no Academy.
export function analistasPendentes(estado) {
  const porEmail = new Map()
  for (const h of estado.hoteis) {
    if (h.teste || !h.csEmail || h.analistaId) continue
    const p = porEmail.get(h.csEmail) ?? { nome: h.csNome || h.csEmail, email: h.csEmail, hoteis: [] }
    p.hoteis.push(h.nome)
    porEmail.set(h.csEmail, p)
  }
  return [...porEmail.values()]
}

const resumoTexto = (r) => r && [
  `${r.clientes} cliente(s) na implantação híbrida`,
  `${r.hoteis_novos} hotel(éis) novo(s)`,
  `${r.contatos_novos} usuário(s) novo(s)`,
  r.conflitos?.length ? `${r.conflitos.length} conflito(s) de e-mail` : null,
].filter(Boolean).join(' · ')

// Painel do admin: regra de entrada, status da última sincronização e botão de sincronizar.
export default function PainelSensedata({ estado }) {
  const { historico } = estado.integracao ?? { historico: [] }
  const [ocupado, setOcupado] = useState(false)
  const ultima = historico?.find((h) => h.origem !== 'fases' && h.origem !== 'parados')
  const pendentes = analistasPendentes(estado)

  async function rodar() {
    setOcupado(true)
    const ok = await tentar(() => sincronizarSensedata())
    setOcupado(false)
    if (ok) alert('Sincronização concluída.')
  }

  return (
    <section className="cartao painel-sense" aria-labelledby="t-sense">
      <div className="painel-sense-topo">
        <div>
          <h2 id="t-sense">Integração com o Sensedata</h2>
          <p className="muted pequeno">
            {ultima
              ? <>Última sincronização ({ultima.origem}): {fmtDataHora(ultima.terminado_em ?? ultima.iniciado_em)} · {ultima.ok ? <span className="ok-texto">ok</span> : <span className="erro-texto">com problema</span>}</>
              : 'Ainda não sincronizado.'}
          </p>
        </div>
        <button className="btn primario" onClick={rodar} disabled={ocupado}>
          {ocupado ? 'Sincronizando…' : 'Sincronizar agora'}
        </button>
      </div>

      <p className="pequeno">
        Entram só os clientes com o playbook <b>Onboarding - Implantação Híbrida</b> e o campo <b>implantacao_academy</b> preenchido.
        Depois da primeira sincronização que der certo, ela também roda sozinha de hora em hora.
      </p>

      {ultima && !ultima.ok && <div className="alerta erro">{ultima.erro}</div>}
      {ultima?.ok && <p className="pequeno">{resumoTexto(ultima.resumo)}</p>}
      {ultima?.resumo?.conflitos?.length > 0 && (
        <details className="pequeno"><summary>Ver conflitos de e-mail</summary><ul>{ultima.resumo.conflitos.map((c) => <li key={c}>{c}</li>)}</ul></details>
      )}
      {ultima?.resumo?.fora?.length > 0 && (
        <details className="pequeno"><summary>{ultima.resumo.fora.length} cliente(s) com o playbook ficaram de fora</summary><ul>{ultima.resumo.fora.map((c) => <li key={c}>{c}</li>)}</ul></details>
      )}

      {pendentes.length > 0 && (
        <div className="alerta aviso-analista" role="status">
          <b>⚠ {pendentes.length} analista(s) do Sensedata ainda não cadastrado(s) no Academy.</b> Os hotéis deles ficam sem analista até você cadastrar.
          <ul>{pendentes.map((p) => <li key={p.email}>{p.nome} ({p.email}) · {p.hoteis.length} hotel(éis)</li>)}</ul>
          <a className="btn" href="#/analistas">Cadastrar em Analistas</a>
        </div>
      )}

      <Parados estado={estado} />
    </section>
  )
}

const MOTIVO = { sem_avancar: 'sem avançar', sem_entrar: 'sem entrar' }

// Clientes parados há mais de 7 dias viram tarefa para o CS no Sensedata (todo dia útil às 9h).
function Parados({ estado }) {
  const { historico, alertasParado: cfg, alertas = [] } = estado.integracao ?? {}
  const [ocupado, setOcupado] = useState(false)
  const ultima = historico?.find((h) => h.origem === 'parados')
  const nomeHotel = (id) => estado.hoteis.find((h) => h.id === id)?.nome ?? 'Hotel'
  const somente = cfg?.somente_hoteis ?? []

  async function verificar() {
    setOcupado(true)
    const ok = await tentar(() => sincronizarSensedata('parados'))
    setOcupado(false)
    if (ok) alert('Verificação concluída.')
  }

  return (
    <div className="painel-sense-parados">
      <div className="painel-sense-topo">
        <div>
          <h3>Clientes parados</h3>
          <p className="muted pequeno">
            Com {cfg?.dias ?? 7} dias sem avançar ou sem entrar no Academy, o CS recebe uma tarefa no Sensedata (uma por parada).
            Verifica todo dia útil às 9h.
          </p>
        </div>
        <button className="btn" onClick={verificar} disabled={ocupado}>{ocupado ? 'Verificando…' : 'Verificar agora'}</button>
      </div>
      {cfg && !cfg.ativo && <div className="alerta">Desligado.</div>}
      {somente.length > 0 && (
        <div className="alerta" role="status">Em teste: só vale para {somente.map(nomeHotel).join(', ')}.</div>
      )}
      {ultima && (
        <p className="pequeno">
          Última verificação: {fmtDataHora(ultima.terminado_em ?? ultima.iniciado_em)} ·{' '}
          {ultima.ok ? `${ultima.resumo?.tarefas ?? 0} tarefa(s) criada(s)` : <span className="erro-texto">{ultima.erro}</span>}
        </p>
      )}
      {alertas.length > 0 && (
        <details className="pequeno">
          <summary>Tarefas criadas ({alertas.length})</summary>
          <ul>
            {alertas.map((a) => (
              <li key={a.id}>
                {fmtDataHora(a.criado_em)} · <b>{nomeHotel(a.hotel_id)}</b> · {a.motivos.map((m) => MOTIVO[m] ?? m).join(' e ')} · para {a.responsavel}
                {!a.ok && <span className="erro-texto"> · não criada: {a.erro}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
