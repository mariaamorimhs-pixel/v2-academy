import { dadosDoHotel, Marca, Selo, Barra } from '../comum.jsx'

// Trilha de um produto: etapas e passos, com os bloqueados travados.
export default function Produto({ estado, hotelId, codigo }) {
  const { jornada, prog } = dadosDoHotel(estado, hotelId)
  const seg = jornada.find((s) => s.tipo === 'produto' && s.codigo === codigo)
  if (!seg) return <Voltar texto="Este produto não faz parte da sua implantação." />
  if (prog.status[seg.id] === 'bloqueado') return <Voltar texto={`A trilha do ${seg.nome} abre quando você concluir as etapas anteriores.`} />

  const ids = seg.etapas.flatMap((e) => e.passos.map((p) => p.id))
  const feitos = ids.filter((id) => prog.status[id] === 'concluido').length

  return (
    <>
      <a href="#/implantacao" className="voltar">← Minha implantação</a>
      <header className="cabecalho cabecalho-produto" style={{ '--cor': seg.cor }}>
        <div>
          <h1>{seg.nome}</h1>
          <p className="muted">{seg.descricao} · {feitos} de {ids.length} passos concluídos</p>
        </div>
        <div className="cabecalho-barra"><Barra pct={ids.length ? Math.round((feitos / ids.length) * 100) : 0} /></div>
      </header>

      <div className="etapas">
        {seg.etapas.map((e, i) => {
          const sts = e.passos.map((p) => prog.status[p.id])
          const stEtapa = sts.every((s) => s === 'concluido') ? 'concluido'
            : sts.every((s) => s === 'bloqueado') ? 'bloqueado'
            : sts.includes('atual') ? 'atual'
            : sts.every((s) => s === 'embreve' || s === 'concluido') ? 'embreve' : 'bloqueado'
          return (
            <section key={e.id} className={`etapa ${stEtapa}`}>
              <header>
                <span className="etapa-num">{i + 1}</span>
                <div>
                  <h2>{e.titulo}</h2>
                  {e.nota && <p className="muted pequeno">{e.nota}</p>}
                </div>
                <span className="pequeno muted">{e.passos.length} {e.passos.length === 1 ? 'passo' : 'passos'}</span>
              </header>
              <ul className="passos">
                {e.passos.map((p) => {
                  const st = prog.status[p.id]
                  return (
                    <li key={p.id} className={st}>
                      {st === 'bloqueado'
                        ? <div className="passo-linha"><Marca status={st} /><span>{p.titulo}</span></div>
                        : <a className="passo-linha" href={`#/passo/${p.id}`}><Marca status={st} /><span>{p.titulo}</span>{st === 'atual' && <Selo status="atual">Próximo</Selo>}{st === 'embreve' && <Selo status="embreve" />}</a>}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}

export function Voltar({ texto }) {
  return (
    <div className="cartao vazio-cartao">
      <p>{texto}</p>
      <a className="btn" href="#/implantacao">Voltar para minha implantação</a>
    </div>
  )
}
