import { dadosDoHotel, Barra, Marca, Selo, fmtDataHora, nomeReuniao, assuntoReuniao, saudacao, ProgressoImplantacao, textoDesbloqueio } from '../comum.jsx'
import { nomeProduto } from '../trilhas.js'

// Tela inicial do cliente: os produtos do hotel na ordem, cada reunião entre os blocos, e onde ele está agora.
export default function Jornada({ estado, usuario, hotelId }) {
  const d = dadosDoHotel(estado, hotelId)
  if (!d) return <p>Hotel não encontrado.</p>
  const { hotel, progresso, jornada, prog, analista } = d
  const primeiroNome = usuario.nome.split(' ')[0]

  const destinoAtual = prog.atual
    ? prog.atual.tipo === 'passo' ? `#/passo/${prog.atual.id}` : `#/reuniao/${prog.atual.numero}`
    : null

  return (
    <>
      <section className="cartao destaque">
        <div className="destaque-texto">
          <p className="sobre">{hotel.nome}</p>
          <h1>{saudacao()}, <span className="destaque-nome">{primeiroNome}</span>.</h1>
          <p className="muted">
            {prog.atual
              ? <>Próximo passo: <b>{prog.atual.tipo === 'passo' ? prog.atual.passo.titulo : `${nomeReuniao(prog.atual.reuniao)} com ${analista?.nome ?? 'seu analista'}`}</b></>
              : 'Sua implantação está concluída. Os treinamentos continuam disponíveis para consulta.'}
          </p>
        </div>
        <div className="destaque-progresso">
          <div className="numero-grande">{prog.pct}%</div>
          <ProgressoImplantacao prog={prog} />
          {destinoAtual && <a className="btn primario" href={destinoAtual}>Continuar →</a>}
        </div>
      </section>

      <ol className="jornada">
        {jornada.map((seg) => {
          const st = prog.status[seg.id]
          if (seg.tipo === 'produto') {
            const ids = seg.etapas.flatMap((e) => e.passos.map((p) => p.id))
            const feitos = ids.filter((id) => prog.status[id] === 'concluido').length
            const pct = ids.length ? Math.round((feitos / ids.length) * 100) : 0
            const aberto = st !== 'bloqueado' && st !== 'preparacao'
            const Tag = aberto ? 'a' : 'div'
            return (
              <li key={seg.id} className={`jornada-item ${st}`} style={{ '--cor': seg.cor }}>
                <Marca status={st} />
                <Tag className="jornada-cartao produto" {...(aberto ? { href: `#/produto/${seg.codigo}` } : {})}>
                  <div className="jornada-cabeca">
                    <div>
                      <h2>{seg.nome}</h2>
                      <p className="muted pequeno">{seg.descricao}</p>
                    </div>
                    <Selo status={st}>{st === 'bloqueado' ? textoDesbloqueio(jornada, seg) : undefined}</Selo>
                  </div>
                  {ids.length > 0 && st !== 'bloqueado' && (
                    <div className="jornada-progresso">
                      <Barra pct={pct} fina />
                      <span className="pequeno muted">{feitos}/{ids.length} passos</span>
                    </div>
                  )}
                  {st === 'preparacao' && <p className="pequeno muted">O conteúdo deste produto está sendo preparado. Ele não trava sua jornada.</p>}
                </Tag>
              </li>
            )
          }
          const r = progresso.reunioes?.[seg.numero] ?? {}
          const aberto = st !== 'bloqueado'
          const Tag = aberto ? 'a' : 'div'
          return (
            <li key={seg.id} className={`jornada-item reuniao ${st}`}>
              <Marca status={st} />
              <Tag className="jornada-cartao" {...(aberto ? { href: `#/reuniao/${seg.numero}` } : {})}>
                <div className="jornada-cabeca">
                  <div>
                    <h2>{nomeReuniao(seg)} com o analista</h2>
                    <p className="muted pequeno">Sobre {assuntoReuniao(seg, nomeProduto)}</p>
                  </div>
                  <Selo status={st}>
                    {st === 'concluido' ? 'Realizada'
                      : st === 'bloqueado' ? textoDesbloqueio(jornada, seg)
                      : r.agendadaEm ? 'Agendada' : 'Agende agora'}
                  </Selo>
                </div>
                {st === 'atual' && r.agendadaEm && (
                  <p className="pequeno">{r.agendadaPara ? `Marcada para ${fmtDataHora(r.agendadaPara)}` : 'Marcada pelo Calendly'} · aguardando o analista confirmar a realização</p>
                )}
              </Tag>
            </li>
          )
        })}
      </ol>
    </>
  )
}
