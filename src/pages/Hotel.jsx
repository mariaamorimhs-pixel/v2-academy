import { dadosDoHotel, Barra, Marca, Selo, fmtDataHora, fmtData, nomeReuniao, assuntoReuniao, tentar } from '../comum.jsx'
import { nomeProduto } from '../trilhas.js'
import { avaliarContrato } from '../regras.js'
import { marcarReuniaoRealizada, zerarHotelTeste } from '../dados.js'
import { BotaoConvite } from './Analistas.jsx'
import { situacaoDoHotel } from './Hoteis.jsx'

// Detalhe do hotel para o analista: contratos lidos do Sensedata, usuários, progresso por produto
// e o botão que confirma a reunião e libera o próximo bloco.
export default function Hotel({ estado, usuario, hotelId, onSimular }) {
  const d = dadosDoHotel(estado, hotelId)
  if (!d) return <p>Hotel não encontrado.</p>
  const { hotel, progresso, jornada, prog, analista } = d
  const sit = situacaoDoHotel(d)
  const usuarios = estado.usuarios.filter((u) => u.hotelId === hotel.id)

  function confirmar(seg) {
    const r = progresso.reunioes?.[seg.numero] ?? {}
    const aviso = r.agendadaEm ? '' : '\n\nAtenção: o cliente ainda não agendou esta reunião pelo sistema.'
    if (confirm(`Confirmar que a ${nomeReuniao(seg).replace(/^R/, 'r')} com ${hotel.nome} foi realizada? O próximo módulo será liberado para o hotel.${aviso}`)) {
      tentar(() => marcarReuniaoRealizada(hotel.id, seg.numero))
    }
  }
  const editora = usuario.perfil === 'editora'

  return (
    <>
      <a href={usuario.perfil === 'editora' ? '#/hoteis' : '#/'} className="voltar">← {usuario.perfil === 'editora' ? 'Hotéis' : 'Meus hotéis'}</a>
      <header className="cabecalho">
        <div>
          <h1>{hotel.nome}</h1>
          <p className="muted">{hotel.cidade} · Analista {analista?.nome} · Sensedata: {hotel.statusSense}</p>
        </div>
        <div className="cabecalho-barra">
          <div className="numero-medio">{prog.pct}%</div>
          <Barra pct={prog.pct} />
          <p className="muted pequeno">Etapa atual: {sit.etapa} · parado há {sit.dias} {sit.dias === 1 ? 'dia' : 'dias'}</p>
        </div>
      </header>

      <div className="hotel-grade">
        <div className="hotel-jornada">
          {jornada.map((seg) => {
            const st = prog.status[seg.id]
            if (seg.tipo === 'reuniao') {
              const r = progresso.reunioes?.[seg.numero] ?? {}
              return (
                <section key={seg.id} className={`cartao bloco-reuniao ${st}`}>
                  <Marca status={st} />
                  <div className="bloco-reuniao-texto">
                    <h2>{nomeReuniao(seg)}</h2>
                    <p className="muted pequeno">
                      {st === 'concluido' ? `Realizada em ${fmtDataHora(r.realizadaEm)} · confirmada por ${r.realizadaPor}`
                        : st === 'bloqueado' ? 'Abre quando o cliente concluir a trilha deste bloco'
                        : r.agendadaEm ? (r.agendadaPara ? `Agendada para ${fmtDataHora(r.agendadaPara)}` : 'Agendada pelo Calendly')
                        : 'Trilha concluída · aguardando o cliente agendar'}
                    </p>
                  </div>
                  {st === 'atual' && <button className="btn primario" onClick={() => confirmar(seg)}>Reunião realizada</button>}
                </section>
              )
            }
            const ids = seg.etapas.flatMap((e) => e.passos.map((p) => p.id))
            const feitos = ids.filter((id) => prog.status[id] === 'concluido').length
            return (
              <section key={seg.id} className={`cartao cartao-produto ${st}`} style={{ '--cor': seg.cor }}>
                <div className="jornada-cabeca">
                  <div>
                    <h2>{seg.nome}</h2>
                    <p className="muted pequeno">{ids.length ? `${feitos} de ${ids.length} passos` : 'Trilha em preparação'}</p>
                  </div>
                  <Selo status={st} />
                </div>
                {ids.length > 0 && (
                  <details open={st === 'atual'}>
                    <summary>Ver passos</summary>
                    <ul className="passos compacto">
                      {seg.etapas.flatMap((e) => e.passos.map((p) => {
                        const feito = progresso.passos?.[p.id]
                        return (
                          <li key={p.id} className={prog.status[p.id]}>
                            <div className="passo-linha">
                              <Marca status={prog.status[p.id]} />
                              <span>{e.titulo}{e.passos.length > 1 && ` · ${p.titulo}`}</span>
                              {feito && <span className="muted pequeno">{feito.por.split(' ')[0]}, {fmtData(feito.em)}</span>}
                            </div>
                          </li>
                        )
                      }))}
                    </ul>
                  </details>
                )}
              </section>
            )
          })}
        </div>

        <aside className="hotel-lado">
          {editora && (
            <section className="cartao ferramentas">
              <h2>Ferramentas da editora</h2>
              <button className="btn" onClick={() => onSimular(hotel.id)}>Ver como o cliente</button>
              {hotel.teste && (
                <button className="btn fantasma" onClick={() => {
                  if (confirm(`Apagar todo o progresso de ${hotel.nome}? Só hotéis de teste podem ser zerados.`)) tentar(() => zerarHotelTeste(hotel.id))
                }}>Zerar progresso (hotel de teste)</button>
              )}
            </section>
          )}
          <section className="cartao">
            <h2>Contratos no Sensedata</h2>
            <ul className="lista-simples">
              {hotel.contratos.map((c) => {
                const av = avaliarContrato(c)
                return (
                  <li key={c.plano + (c.fim ?? '')}>
                    <code>{c.plano}</code>
                    {av.entra ? <span className="selo concluido">Na trilha</span> : <span className="muted pequeno">{av.motivo}{c.fim ? ` (fim ${fmtData(c.fim + 'T12:00')})` : ''}</span>}
                  </li>
                )
              })}
            </ul>
          </section>
          <section className="cartao">
            <h2>Usuários do hotel</h2>
            <ul className="lista-simples">
              {usuarios.map((u) => (
                <li key={u.id}>
                  <span><b>{u.nome}</b><br /><span className="muted pequeno">{u.email}</span></span>
                  {editora && <BotaoConvite usuario={u} />}
                </li>
              ))}
            </ul>
            <p className="muted pequeno">Vêm dos contatos do hotel no Sensedata.</p>
          </section>
        </aside>
      </div>
    </>
  )
}
