import { useMemo, useState } from 'react'
import { dadosDoHotel, diasDesde } from '../comum.jsx'
import { CATALOGO } from '../trilhas.js'

// Dashboard (admin: todos os hotéis; analista: só os dele, pelas regras do banco): resumo geral das implantações e, por produto, o funil por etapa
// (quantos hotéis já concluíram cada etapa) com o gargalo (etapa onde mais hotéis estão parados agora;
// só conta como gargalo com 2 ou mais hotéis, para empates de 1 não virarem alerta).

const DIAS_PARADO = 7
const PRODUTOS = ['HBOOK', 'HUNIT', 'HCORP', 'HBOT', 'HPRICE']

function calcular(estado, incluirTeste) {
  const hoteis = estado.hoteis.filter((h) => incluirTeste || !h.teste).map((h) => dadosDoHotel(estado, h.id))

  const concluidas = hoteis.filter((d) => !d.prog.atual)
  const emAndamento = hoteis.filter((d) => d.prog.atual)
  const resumo = {
    total: hoteis.length,
    emImplantacao: emAndamento.length,
    concluidas: concluidas.length,
    avancoMedio: hoteis.length ? Math.round(hoteis.reduce((s, d) => s + d.prog.pct, 0) / hoteis.length) : 0,
    parados: emAndamento.filter((d) => diasDesde(d.progresso.ultimaAtividade) >= DIAS_PARADO).length,
    reunioesAguardando: hoteis.reduce((s, d) => s + Object.values(d.progresso.reunioes ?? {}).filter((r) => r.agendadaEm && !r.realizadaEm).length, 0),
  }

  const produtos = PRODUTOS.map((codigo) => {
    const comProduto = hoteis.map((d) => ({ d, seg: d.jornada.find((s) => s.tipo === 'produto' && s.codigo === codigo) })).filter((x) => x.seg)
    const st = (x) => x.d.prog.status[x.seg.id]
    const concluiram = comProduto.filter((x) => st(x) === 'concluido').length
    const naoIniciaram = comProduto.filter((x) => st(x) === 'bloqueado').length

    // Funil: para cada etapa do catálogo, entre os hotéis que têm essa etapa na jornada,
    // quantos já concluíram todos os passos dela e quantos estão nela agora.
    const etapas = CATALOGO[codigo].etapas.map((etapaCat) => {
      const comEtapa = comProduto.map((x) => ({ ...x, etapa: x.seg.etapas.find((e) => e.id === etapaCat.id) })).filter((x) => x.etapa)
      const concluida = comEtapa.filter((x) => x.etapa.passos.every((p) => x.d.prog.status[p.id] === 'concluido')).length
      const agoraAqui = comEtapa.filter((x) => x.d.prog.atual?.tipo === 'passo' && x.d.prog.atual.etapa.id === etapaCat.id).length
      return { id: etapaCat.id, titulo: etapaCat.titulo, total: comEtapa.length, concluida, agoraAqui }
    })
    const maxAgora = Math.max(0, ...etapas.map((e) => e.agoraAqui))
    return {
      codigo, nome: CATALOGO[codigo].marca, cor: CATALOGO[codigo].cor,
      total: comProduto.length, concluiram, naoIniciaram, emAndamento: comProduto.length - concluiram - naoIniciaram,
      etapas: etapas.map((e) => ({ ...e, gargalo: maxAgora >= 2 && e.agoraAqui === maxAgora })),
    }
  })

  return { resumo, produtos }
}

export default function Dashboard({ estado, usuario }) {
  const [incluirTeste, setIncluirTeste] = useState(false)
  const { resumo, produtos } = useMemo(() => calcular(estado, incluirTeste), [estado, incluirTeste])
  const qtdTeste = estado.hoteis.filter((h) => h.teste).length
  const analista = usuario?.perfil === 'analista'

  return (
    <>
      <header className="cabecalho">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">
            {analista
              ? <>Andamento dos seus hotéis e dos treinamentos por produto. A lista completa está em <a href="#/hoteis">Meus hotéis</a>.</>
              : 'Andamento das implantações e dos treinamentos por produto.'}
          </p>
        </div>
        <label className="check-filtro">
          <input type="checkbox" checked={incluirTeste} onChange={(e) => setIncluirTeste(e.target.checked)} />
          Incluir hotéis de teste ({qtdTeste})
        </label>
      </header>

      {resumo.total === 0 ? (
        <div className="cartao vazio-cartao">
          <p>{analista ? 'Você ainda não tem hotéis reais em implantação.' : 'Ainda não há hotéis reais em implantação.'}</p>
          <p className="muted pequeno">Marque "Incluir hotéis de teste" para ver os números com os dados de teste.</p>
        </div>
      ) : (
        <>
          <section aria-labelledby="t-resumo">
            <h2 id="t-resumo" className="secao-titulo">Resumo geral</h2>
            <div className="kpis">
              <Kpi rotulo="Em implantação" valor={resumo.emImplantacao} detalhe={`de ${resumo.total} ${resumo.total === 1 ? 'hotel' : 'hotéis'}`} />
              <Kpi rotulo="Implantações concluídas" valor={resumo.concluidas} detalhe={`${resumo.total ? Math.round((resumo.concluidas / resumo.total) * 100) : 0}% do total`} />
              <Kpi rotulo="Avanço médio" valor={`${resumo.avancoMedio}%`} detalhe="dos passos e reuniões" />
              <Kpi rotulo={`Parados há ${DIAS_PARADO}+ dias`} valor={resumo.parados} detalhe="sem nenhuma atividade" alerta={resumo.parados > 0} />
              <Kpi rotulo="Reuniões aguardando confirmação" valor={resumo.reunioesAguardando} detalhe="agendadas, ainda não confirmadas" />
            </div>
          </section>

          <section aria-labelledby="t-produtos" className="secao">
            <h2 id="t-produtos" className="secao-titulo">Por produto e gargalos</h2>
            <p className="muted pequeno">A barra mostra quantos hotéis já concluíram cada etapa. "Gargalo" marca a etapa onde mais hotéis (2 ou mais) estão parados agora.</p>
            <div className="grade-produtos-dash">
              {produtos.map((p) => <CartaoProduto key={p.codigo} p={p} />)}
            </div>
          </section>
        </>
      )}
    </>
  )
}

function Kpi({ rotulo, valor, detalhe, alerta }) {
  return (
    <div className={`kpi ${alerta ? 'alerta' : ''}`}>
      <span className="kpi-rotulo">{alerta && <span aria-hidden="true">⚠ </span>}{rotulo}</span>
      <span className="kpi-valor">{valor}</span>
      <span className="kpi-detalhe">{detalhe}</span>
    </div>
  )
}

function CartaoProduto({ p }) {
  return (
    <article className="cartao produto-dash" style={{ '--cor': p.cor }}>
      <header>
        <h3><span className="produto-rotulo" style={{ '--cor': p.cor }}>{p.nome}</span></h3>
        <span className="muted pequeno">{p.total} {p.total === 1 ? 'hotel' : 'hotéis'}</span>
      </header>
      {p.total === 0 ? (
        <p className="muted pequeno">Nenhum hotel com este produto.</p>
      ) : (
        <>
          <dl className="produto-dash-numeros">
            <div><dt>Concluíram</dt><dd>{p.concluiram}</dd></div>
            <div><dt>Em andamento</dt><dd>{p.emAndamento}</dd></div>
            <div><dt>Não iniciaram</dt><dd>{p.naoIniciaram}</dd></div>
          </dl>
          {p.etapas.length === 0 ? (
            <p className="muted pequeno">Trilha ainda não cadastrada.</p>
          ) : (
            <ol className="funil" aria-label={`Etapas do ${p.nome}`}>
              {p.etapas.map((e, i) => {
                const pct = e.total ? Math.round((e.concluida / e.total) * 100) : 0
                const dica = `${e.titulo}: ${e.concluida} de ${e.total} hotéis concluíram (${pct}%)${e.agoraAqui ? ` · ${e.agoraAqui} ${e.agoraAqui === 1 ? 'está' : 'estão'} nesta etapa agora` : ''}`
                return (
                  <li key={e.id} title={dica}>
                    <span className="funil-etapa" aria-hidden="true">{i + 1}. {e.titulo}</span>
                    <span className="funil-barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                    <span className="funil-valor" aria-hidden="true">{e.total ? `${e.concluida}/${e.total}` : '—'}</span>
                    <span className="funil-agora" aria-hidden="true">
                      {e.gargalo
                        ? <span className="selo alerta">⚠ Gargalo · {e.agoraAqui} aqui</span>
                        : e.agoraAqui > 0 ? <span className="muted">{e.agoraAqui} aqui</span> : null}
                    </span>
                    <span className="sr-only">{dica}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </>
      )}
    </article>
  )
}
