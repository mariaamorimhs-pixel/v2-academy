import { useMemo, useState } from 'react'
import { dadosDoHotel } from '../comum.jsx'
import { situacaoDoHotel } from './Hoteis.jsx'

const normal = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Visão do hotel (admin e analista): escolhe um hotel e vê o sistema exatamente como o cliente vê, só para olhar.
// O analista só encontra os hotéis dele (as regras do banco já entregam só esses).
export default function VisaoHotel({ estado, onEscolher }) {
  const [busca, setBusca] = useState('')
  const [comTeste, setComTeste] = useState(false)
  const lista = useMemo(() => {
    const termo = normal(busca.trim())
    return estado.hoteis
      .filter((h) => comTeste || !h.teste)
      .filter((h) => !termo || normal(`${h.nome} ${h.cidade ?? ''}`).includes(termo))
      .map((h) => {
        const d = dadosDoHotel(estado, h.id)
        return { hotel: h, pct: d.prog.pct, sit: situacaoDoHotel(d), analista: d.analista }
      })
  }, [estado, busca, comTeste])
  const qtdTeste = estado.hoteis.filter((h) => h.teste).length

  return (
    <>
      <header className="cabecalho">
        <div>
          <h1>Visão do hotel</h1>
          <p className="muted">Escolha um hotel para ver o sistema exatamente como o cliente vê. É só visualização: nada do que você fizer altera o progresso do hotel.</p>
        </div>
      </header>

      <div className="filtros-acessos">
        <label className="busca-visao">
          <span className="sr-only">Buscar hotel pelo nome ou cidade</span>
          <input type="search" autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar hotel pelo nome ou cidade" />
        </label>
        {qtdTeste > 0 && (
          <label className="check-filtro">
            <input type="checkbox" checked={comTeste} onChange={(e) => setComTeste(e.target.checked)} />
            Incluir hotéis de teste ({qtdTeste})
          </label>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="cartao vazio-cartao"><p className="muted">Nenhum hotel encontrado{busca ? ` para "${busca}"` : ''}.</p></div>
      ) : (
        <ul className="visao-lista">
          {lista.map(({ hotel, pct, sit, analista }) => (
            <li key={hotel.id}>
              <button type="button" className="cartao visao-item" onClick={() => onEscolher(hotel.id)}>
                <span className="visao-item-nome">
                  <b>{hotel.nome}</b>{hotel.teste && <span className="selo">teste</span>}
                  <span className="muted pequeno">{[hotel.cidade, analista && `Analista ${analista.nome}`].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="visao-item-status">
                  <span className="pequeno">{sit.etapa} · {pct}%</span>
                  <span className="visao-item-acao">Ver como o cliente →</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// Faixa no topo enquanto alguém do time está na visão do hotel: troca de hotel sem sair e volta para o sistema.
export function FaixaVisao({ estado, hotel, onEscolher }) {
  const hoteis = [...estado.hoteis].sort((a, b) => a.nome.localeCompare(b.nome))
  return (
    <div className="faixa-visao" role="region" aria-label="Visão do hotel">
      <span><b>Visão do hotel</b> · você está vendo como o cliente vê · só visualização</span>
      <label className="faixa-visao-troca">
        <span className="sr-only">Trocar de hotel</span>
        <select value={hotel.id} onChange={(e) => onEscolher(e.target.value)}>
          {hoteis.map((h) => <option key={h.id} value={h.id}>{h.nome}{h.teste ? ' (teste)' : ''}</option>)}
        </select>
      </label>
      <button className="btn pequeno" onClick={() => onEscolher(null)}>Sair da visão</button>
    </div>
  )
}
