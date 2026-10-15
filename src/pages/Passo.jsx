import { useState } from 'react'
import { dadosDoHotel, Video, Texto, fmtDataHora, nomeReuniao, tentar } from '../comum.jsx'
import { proximaUnidade } from '../regras.js'
import { concluirPasso } from '../dados.js'
import { Voltar } from './Produto.jsx'

// Conteúdo de um passo (também usado na pré-visualização da editora).
export function ConteudoPasso({ produtoNome, etapaTitulo, passo }) {
  return (
    <article className="conteudo-passo">
      <p className="sobre">{produtoNome} · {etapaTitulo}</p>
      <h1>{passo.titulo}</h1>
      <Texto texto={passo.texto} />
      <Video url={passo.video} titulo={passo.titulo} />
    </article>
  )
}

export default function Passo({ estado, hotelId, passoId }) {
  const [salvando, setSalvando] = useState(false)
  const { jornada, progresso, prog } = dadosDoHotel(estado, hotelId)
  const u = prog.unidades.find((x) => x.id === passoId && x.tipo === 'passo')
  if (!u) return <Voltar texto="Passo não encontrado." />
  const st = prog.status[u.id]
  const seg = jornada.find((s) => s.id === u.produto)
  if (st === 'bloqueado') return <Voltar texto="Este passo abre quando você concluir os anteriores." />

  const prox = proximaUnidade(prog, u.id)
  const linkProx = prox && (prox.tipo === 'passo' ? `#/passo/${prox.id}` : `#/reuniao/${prox.numero}`)
  const rotuloProx = prox && (prox.tipo === 'passo' ? prox.passo.titulo : nomeReuniao(prox.reuniao))
  const feito = progresso.passos?.[u.id]

  async function concluir() {
    setSalvando(true)
    const ok = await tentar(() => concluirPasso(hotelId, u.id))
    setSalvando(false)
    if (ok) window.location.hash = linkProx ? linkProx.slice(1) : '/'
  }

  return (
    <>
      <a href={`#/produto/${seg.codigo}`} className="voltar">← Trilha do {seg.nome}</a>
      <div className="passo-layout">
        <ConteudoPasso produtoNome={seg.nome} etapaTitulo={u.etapa.titulo} passo={u.passo} />
        <aside className="cartao passo-acoes">
          {st === 'concluido' ? (
            <>
              <p className="ok-texto">Passo concluído</p>
              <p className="muted pequeno">por {feito?.por} em {fmtDataHora(feito?.em)}</p>
              {linkProx && <a className="btn" href={linkProx}>Próximo: {rotuloProx}</a>}
            </>
          ) : (
            <>
              <p>Assistiu ao vídeo e fez o que ele mostra no sistema?</p>
              <button className="btn primario" onClick={concluir} disabled={salvando}>{salvando ? 'Salvando…' : 'Concluí este passo'}</button>
              <p className="muted pequeno">A conclusão vale para todos os usuários do hotel.{rotuloProx && <> Depois vem: {rotuloProx}.</>}</p>
            </>
          )}
        </aside>
      </div>
    </>
  )
}
