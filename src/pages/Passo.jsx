import { useState } from 'react'
import { dadosDoHotel, Video, Texto, fmtDataHora, nomeReuniao, tentar, JanelaCalendly } from '../comum.jsx'
import { proximaUnidade, proximaDisponivel } from '../regras.js'
import { treinoDoProduto } from '../trilhas.js'
import { concluirPasso } from '../dados.js'
import { Voltar } from './Produto.jsx'

const temConteudo = (passo) => Boolean(passo.texto?.trim() || passo.video?.trim())

// Conteúdo de um passo (também usado nos tutoriais e na pré-visualização da editora).
// Sem texto e sem vídeo, o passo ainda não foi publicado: mostra o aviso e, se houver, os atalhos.
export function ConteudoPasso({ produtoNome, etapaTitulo, passo, atalhos }) {
  return (
    <article className="conteudo-passo">
      <p className="sobre">{produtoNome} · {etapaTitulo}</p>
      <h1>{passo.titulo}</h1>
      {temConteudo(passo) ? (
        <>
          <Texto texto={passo.texto} />
          <Video url={passo.video} titulo={passo.titulo} />
        </>
      ) : (
        <div className="em-preparo">
          <p>Este conteúdo está sendo preparado.</p>
          {atalhos && <div className="acoes">{atalhos}</div>}
        </div>
      )}
    </article>
  )
}

export default function Passo({ estado, hotelId, passoId }) {
  const [salvando, setSalvando] = useState(false)
  const [calendly, setCalendly] = useState(null)
  const { jornada, progresso, prog } = dadosDoHotel(estado, hotelId)
  const u = prog.unidades.find((x) => x.id === passoId && x.tipo === 'passo')
  if (!u) return <Voltar texto="Passo não encontrado." />
  const st = prog.status[u.id]
  const seg = jornada.find((s) => s.id === u.produto)
  if (st === 'bloqueado') return <Voltar texto="Este passo abre quando você concluir os anteriores." />

  const publicado = u.passo.publicado
  // "Depois vem" só aparece se o próximo item já estiver disponível para o cliente.
  const prox = proximaUnidade(prog, u.id)
  const proxVisivel = prox && (prox.tipo !== 'passo' || prox.publicado)
  const rotuloProx = proxVisivel ? (prox.tipo === 'passo' ? prox.passo.titulo : nomeReuniao(prox.reuniao)) : null
  // Ao concluir, segue para o próximo item disponível (pula os não publicados).
  const destino = proximaDisponivel(prog, u.id)
  const linkDestino = destino && (destino.tipo === 'passo' ? `#/passo/${destino.id}` : `#/reuniao/${destino.numero}`)
  const rotuloDestino = destino && (destino.tipo === 'passo' ? destino.passo.titulo : nomeReuniao(destino.reuniao))
  const feito = progresso.passos?.[u.id]
  const treino = treinoDoProduto(seg.codigo)
  const linkTrilha = `#/produto/${seg.codigo}`

  async function concluir() {
    setSalvando(true)
    const ok = await tentar(() => concluirPasso(hotelId, u.id))
    setSalvando(false)
    if (ok) window.location.hash = linkDestino ? linkDestino.slice(1) : '/implantacao'
  }

  const atalhos = (
    <>
      {treino && <button className="btn" onClick={() => setCalendly(treino)}>Ver horários do treinamento ao vivo de {seg.nome}</button>}
      <a className="btn fantasma" href={linkTrilha}>Voltar para a trilha</a>
    </>
  )

  return (
    <>
      <a href={linkTrilha} className="voltar">← Trilha do {seg.nome}</a>
      <div className="passo-layout">
        <ConteudoPasso produtoNome={seg.nome} etapaTitulo={u.etapa.titulo} passo={u.passo} atalhos={atalhos} />
        <aside className="cartao passo-acoes">
          {st === 'concluido' ? (
            <>
              <p className="ok-texto">Passo concluído</p>
              <p className="muted pequeno">por {feito?.por} em {fmtDataHora(feito?.em)}</p>
              {linkDestino && <a className="btn" href={linkDestino}>Próximo: {rotuloDestino}</a>}
            </>
          ) : !publicado ? (
            <>
              <button className="btn primario" disabled>Concluí este passo</button>
              <p className="muted pequeno">Disponível quando o conteúdo for publicado. Ele não trava o seu avanço na implantação.</p>
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
      {calendly && <JanelaCalendly treino={calendly} onFechar={() => setCalendly(null)} />}
    </>
  )
}
