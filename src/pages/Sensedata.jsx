import { useState } from 'react'
import { fmtDataHora, tentar } from '../comum.jsx'
import { sincronizarSensedata, salvarFases } from '../dados.js'

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
  `${r.clientes} cliente(s) nas fases`,
  `${r.hoteis_novos} hotel(éis) novo(s)`,
  `${r.contatos_novos} usuário(s) novo(s)`,
  r.conflitos?.length ? `${r.conflitos.length} conflito(s) de e-mail` : null,
].filter(Boolean).join(' · ')

// Painel da editora: status da última sincronização, escolha das Fases e botões de ação.
export default function PainelSensedata({ estado }) {
  const { fases, fasesEncontradas, historico } = estado.integracao ?? { fases: [], fasesEncontradas: [], historico: [] }
  const [ocupado, setOcupado] = useState(null) // 'sincronizar' | 'fases' | 'salvar'
  const [escolhidas, setEscolhidas] = useState(null) // null = usar as salvas
  const marcadas = escolhidas ?? fases
  const ultima = historico?.find((h) => h.origem !== 'fases')
  const pendentes = analistasPendentes(estado)
  const mudouFases = escolhidas && JSON.stringify([...escolhidas].sort()) !== JSON.stringify([...fases].sort())

  async function rodar(modo) {
    setOcupado(modo)
    const ok = await tentar(() => sincronizarSensedata(modo))
    setOcupado(null)
    if (ok && modo === 'sincronizar') alert('Sincronização concluída.')
  }
  async function salvar() {
    setOcupado('salvar')
    if (await tentar(() => salvarFases(marcadas))) setEscolhidas(null)
    setOcupado(null)
  }
  const alternar = (fase) => setEscolhidas(marcadas.includes(fase) ? marcadas.filter((f) => f !== fase) : [...marcadas, fase])

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
        <button className="btn primario" onClick={() => rodar('sincronizar')} disabled={!!ocupado || !fases.length}
          title={!fases.length ? 'Escolha as Fases antes de sincronizar' : undefined}>
          {ocupado === 'sincronizar' ? 'Sincronizando…' : 'Sincronizar agora'}
        </button>
      </div>

      {ultima && !ultima.ok && <div className="alerta erro">{ultima.erro}</div>}
      {ultima?.ok && <p className="pequeno">{resumoTexto(ultima.resumo)}</p>}
      {ultima?.resumo?.conflitos?.length > 0 && (
        <details className="pequeno"><summary>Ver conflitos de e-mail</summary><ul>{ultima.resumo.conflitos.map((c) => <li key={c}>{c}</li>)}</ul></details>
      )}

      <div className="painel-sense-fases">
        <h3>Fases do Sensedata que entram na esteira</h3>
        {fasesEncontradas.length === 0 ? (
          <p className="muted pequeno">Clique em "Buscar fases" para listar as Fases existentes no Sensedata e escolher as de onboarding.</p>
        ) : (
          <div className="fases-lista">
            {fasesEncontradas.map(({ fase, qtd }) => (
              <label key={fase} className="check-filtro">
                <input type="checkbox" checked={marcadas.includes(fase)} onChange={() => alternar(fase)} />
                {fase} <span className="muted">({qtd})</span>
              </label>
            ))}
          </div>
        )}
        <div className="acoes">
          <button className="btn" onClick={() => rodar('fases')} disabled={!!ocupado}>{ocupado === 'fases' ? 'Buscando…' : 'Buscar fases'}</button>
          {mudouFases && <button className="btn primario" onClick={salvar} disabled={!!ocupado}>{ocupado === 'salvar' ? 'Salvando…' : 'Salvar fases'}</button>}
          {!mudouFases && fases.length > 0 && <span className="muted pequeno">Em uso: {fases.join(', ')}</span>}
        </div>
      </div>

      {pendentes.length > 0 && (
        <div className="alerta aviso-analista" role="status">
          <b>⚠ {pendentes.length} analista(s) do Sensedata ainda não cadastrado(s) no Academy.</b> Os hotéis deles ficam sem analista até você cadastrar.
          <ul>{pendentes.map((p) => <li key={p.email}>{p.nome} ({p.email}) · {p.hoteis.length} hotel(éis)</li>)}</ul>
          <a className="btn" href="#/analistas">Cadastrar em Analistas</a>
        </div>
      )}
    </section>
  )
}
