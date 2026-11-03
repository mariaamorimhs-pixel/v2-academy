import { useState } from 'react'
import { nomeReuniao } from './comum.jsx'

// Link de onde o cliente parou: o analista copia e manda para o cliente que se perdeu na jornada.
// O link abre direto no passo (ou na reunião) atual; se a pessoa não estiver logada, entra e cai no mesmo lugar.

const base = () => `${window.location.origin}${window.location.pathname}`

export function ondeParou(d) {
  const a = d.prog.atual
  if (!a) return { rota: '/implantacao', descricao: 'Implantação concluída' }
  if (a.tipo === 'passo') {
    const seg = d.jornada.find((s) => s.id === a.produto)
    return { rota: `/passo/${a.id}`, descricao: `${seg?.nome ?? a.produto} · ${a.etapa.titulo} · ${a.passo.titulo}` }
  }
  return { rota: `/reuniao/${a.numero}`, descricao: nomeReuniao(a.reuniao) }
}

export const linkOndeParou = (d) => `${base()}#${ondeParou(d).rota}`

export function mensagemOndeParou(d) {
  const { descricao } = ondeParou(d)
  const link = linkOndeParou(d)
  if (!d.prog.atual) return `Olá! Sua implantação no HSystem Academy está concluída. Os treinamentos continuam disponíveis em: ${link}`
  return `Olá! Para continuar sua implantação no HSystem Academy de onde você parou (${descricao}), acesse: ${link}\n`
    + 'Se pedir login, é só entrar com o seu e-mail e senha.'
}

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true } catch { window.prompt('Copie:', texto); return false }
}

function BotaoCopiar({ texto, rotulo, className = 'btn pequeno', ariaLabel }) {
  const [ok, setOk] = useState(false)
  return (
    <button type="button" className={className} aria-label={ariaLabel}
      onClick={async (e) => { e.stopPropagation(); if (await copiar(texto)) { setOk(true); setTimeout(() => setOk(false), 2000) } }}>
      {ok ? 'Copiado ✓' : rotulo}
    </button>
  )
}

// Cartão na página do hotel: onde parou, o link e a mensagem pronta para mandar.
export function CartaoOndeParou({ d }) {
  const { descricao } = ondeParou(d)
  const link = linkOndeParou(d)
  return (
    <section className="cartao onde-parou">
      <h2>Onde o cliente parou</h2>
      <p className="onde-parou-etapa">{descricao}</p>
      <p className="muted pequeno onde-parou-link">{link}</p>
      <div className="acoes">
        <BotaoCopiar texto={link} rotulo="Copiar link" />
        <BotaoCopiar texto={mensagemOndeParou(d)} rotulo="Copiar mensagem" />
      </div>
      <p className="muted pequeno">Mande por e-mail ou WhatsApp para o cliente voltar direto para esse ponto.</p>
    </section>
  )
}

// Botão compacto para a lista de hotéis.
export function CopiarLinkOndeParou({ d }) {
  return <BotaoCopiar texto={linkOndeParou(d)} rotulo="Copiar link" className="btn pequeno fantasma"
    ariaLabel={`Copiar o link de onde ${d.hotel.nome} parou`} />
}
