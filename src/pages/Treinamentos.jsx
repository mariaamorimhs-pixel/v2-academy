import { useState } from 'react'
import { dadosDoHotel, Video, fmtData } from '../comum.jsx'
import { TREINAMENTOS_GRUPO } from '../trilhas.js'
import { TreinosAoVivo, GradeTutoriais } from './Inicio.jsx'

// Grupo "Treinamentos" do menu do cliente: ao vivo em grupo, tutoriais e gravações das turmas.

export function AoVivo({ estado, hotelId }) {
  const d = dadosDoHotel(estado, hotelId)
  if (!d) return <p>Hotel não encontrado.</p>
  return (
    <>
      <header className="cabecalho">
        <div>
          <h1>Treinamentos ao vivo em grupo</h1>
          <p className="muted">Webinars de 1 hora no Zoom com especialistas da HSystem. Perdeu uma turma? Veja em <a href="#/gravados">Gravados</a>.</p>
        </div>
      </header>
      <TreinosAoVivo d={d} hotelId={hotelId} titulo={false} />
    </>
  )
}

export function ListaTutoriais() {
  return (
    <>
      <header className="cabecalho">
        <div>
          <h1>Tutoriais</h1>
          <p className="muted">O passo a passo de cada produto para consultar quando quiser, sem ordem e sem trava.</p>
        </div>
      </header>
      <GradeTutoriais />
    </>
  )
}

const treinoPorId = Object.fromEntries(TREINAMENTOS_GRUPO.map((t) => [t.id, t]))

// Gravações das turmas ao vivo, por treinamento. Todos os clientes veem todas.
export function Gravados({ estado, gravacaoId }) {
  const [filtro, setFiltro] = useState('todos')
  const gravacoes = estado.gravacoes ?? []

  if (gravacaoId) {
    const g = gravacoes.find((x) => x.id === gravacaoId)
    if (!g) return <><a href="#/gravados" className="voltar">← Gravados</a><p>Gravação não encontrada.</p></>
    const t = treinoPorId[g.treino_id]
    return (
      <>
        <a href="#/gravados" className="voltar">← Gravados</a>
        <header className="cabecalho">
          <div>
            <span className="gravacao-etiqueta" style={{ '--cor': t?.cor }}>{t ? `Treinamento do ${t.titulo}` : 'Treinamento'}</span>
            <h1>{g.titulo}</h1>
            {g.gravado_em && <p className="muted">Gravado em {fmtData(g.gravado_em + 'T12:00:00')}</p>}
          </div>
        </header>
        <div className="cartao gravacao-player">
          <Video url={g.video} titulo={g.titulo} />
          {g.descricao && <p className="gravacao-descricao">{g.descricao}</p>}
        </div>
      </>
    )
  }

  const usados = TREINAMENTOS_GRUPO.filter((t) => gravacoes.some((g) => g.treino_id === t.id))
  const lista = gravacoes.filter((g) => filtro === 'todos' || g.treino_id === filtro)
  return (
    <>
      <header className="cabecalho">
        <div>
          <h1>Treinamentos gravados</h1>
          <p className="muted">As gravações das turmas ao vivo para assistir quando quiser.</p>
        </div>
      </header>
      {gravacoes.length === 0 ? (
        <div className="cartao vazio-cartao">
          <p>As gravações das turmas vão aparecer aqui.</p>
          <a className="btn" href="#/ao-vivo">Ver as próximas turmas ao vivo</a>
        </div>
      ) : (
        <>
          {usados.length > 1 && (
            <div className="segmentos gravados-filtro" role="group" aria-label="Filtrar por treinamento">
              {[{ id: 'todos', titulo: 'Todos' }, ...usados].map((t) => (
                <button key={t.id} type="button" className={filtro === t.id ? 'ativo' : ''} aria-pressed={filtro === t.id} onClick={() => setFiltro(t.id)}>{t.titulo}</button>
              ))}
            </div>
          )}
          <ul className="grade-gravados">
            {lista.map((g) => {
              const t = treinoPorId[g.treino_id]
              return (
                <li key={g.id}>
                  <a className="cartao cartao-gravacao" href={`#/gravados/${g.id}`} style={{ '--cor': t?.cor }}>
                    <span className="gravacao-etiqueta">{t ? t.titulo : 'Treinamento'}</span>
                    <b>{g.titulo}</b>
                    {g.descricao && <span className="muted pequeno gravacao-resumo">{g.descricao}</span>}
                    <span className="gravacao-rodape">
                      <span className="muted pequeno">{g.gravado_em ? `Gravado em ${fmtData(g.gravado_em + 'T12:00:00')}` : ''}</span>
                      <span className="gravacao-assistir">Assistir →</span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}
