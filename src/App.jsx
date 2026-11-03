import { useEffect, useState } from 'react'
import { supabase, LINK_DE_SENHA } from './supabase.js'
import { useEstado, recarregar, limparDados, definirSomenteLeitura } from './dados.js'
import Login from './pages/Login.jsx'
import Jornada from './pages/Jornada.jsx'
import Produto from './pages/Produto.jsx'
import Passo from './pages/Passo.jsx'
import Reuniao from './pages/Reuniao.jsx'
import Hoteis from './pages/Hoteis.jsx'
import Hotel from './pages/Hotel.jsx'
import Editor from './pages/Editor.jsx'
import Analistas from './pages/Analistas.jsx'
import Inicio from './pages/Inicio.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Acessos from './pages/Acessos.jsx'
import VisaoHotel, { FaixaVisao } from './pages/VisaoHotel.jsx'
import Pesquisas from './pages/Pesquisas.jsx'
import PesquisaPublica from './pages/PesquisaPublica.jsx'
import { AoVivo, ListaTutoriais, Gravados } from './pages/Treinamentos.jsx'
import Gravacoes from './pages/Gravacoes.jsx'
import { SomenteLeitura } from './comum.jsx'
import Layout from './Layout.jsx'
import { TutoriaisProduto, TutorialPasso } from './pages/Tutoriais.jsx'

const SIMULACAO = 'implantacao-hibrida-simulando'

// Rotas por hash: #/produto/HBOOK, #/passo/hbook-2-1, #/hotel/<id>…
const lerRota = () => {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h.startsWith('pesquisa/')) return h.split('?')[0].split('/').filter(Boolean) // aceita #/pesquisa/x?utm_source=…
  return h.includes('=') ? [] : h.split('/').filter(Boolean) // ignora o retorno dos links do Supabase (#access_token=…)
}

// Menu lateral por perfil, em grupos (como nos outros produtos HSystem).
const MENU = {
  cliente: [
    { titulo: 'Implantação', itens: [{ rota: '', rotulo: 'Início', icone: 'inicio' }, { rota: 'implantacao', rotulo: 'Minha implantação', icone: 'implantacao' }] },
    { titulo: 'Treinamentos', itens: [
      { rota: 'ao-vivo', rotulo: 'Ao vivo em grupo', icone: 'aovivo' }, { rota: 'tutoriais', rotulo: 'Tutoriais', icone: 'tutoriais' },
      { rota: 'gravados', rotulo: 'Gravados', icone: 'gravados' },
    ] },
  ],
  analista: [
    { titulo: 'Acompanhamento', itens: [
      { rota: '', rotulo: 'Dashboard', icone: 'dashboard' }, { rota: 'hoteis', rotulo: 'Meus hotéis', icone: 'hoteis' },
      { rota: 'visao', rotulo: 'Visão do hotel', icone: 'visao' },
    ] },
  ],
  admin: [
    { titulo: 'Acompanhamento', itens: [
      { rota: 'dashboard', rotulo: 'Dashboard', icone: 'dashboard' }, { rota: 'hoteis', rotulo: 'Hotéis', icone: 'hoteis' },
      { rota: 'visao', rotulo: 'Visão do hotel', icone: 'visao' },
    ] },
    { titulo: 'Conteúdo', itens: [{ rota: '', rotulo: 'Trilhas', icone: 'conteudo' }, { rota: 'gravacoes', rotulo: 'Gravações', icone: 'gravados' }, { rota: 'pesquisas', rotulo: 'Pesquisas', icone: 'pesquisas' }] },
    { titulo: 'Gestão', itens: [{ rota: 'analistas', rotulo: 'Analistas', icone: 'analistas' }, { rota: 'acessos', rotulo: 'Acessos', icone: 'acessos' }] },
  ],
}
const PAPEL = { cliente: 'Cliente', analista: 'Analista', admin: 'Admin' }

// Título da aba por tela: "Início · HSystem Academy", "Minha implantação · HSystem Academy"…
function tituloDaAba(perfil, pagina) {
  const nome = perfil === 'cliente'
    ? (['implantacao', 'produto', 'passo', 'reuniao'].includes(pagina) ? 'Minha implantação' : ['tutoriais', 'tutorial'].includes(pagina) ? 'Tutoriais'
      : pagina === 'ao-vivo' ? 'Ao vivo em grupo' : pagina === 'gravados' ? 'Gravados' : 'Início')
    : pagina === 'hoteis' || pagina === 'hotel' ? (perfil === 'analista' ? 'Meus hotéis' : 'Hotéis')
    : pagina === 'analistas' ? 'Analistas' : pagina === 'acessos' ? 'Acessos' : pagina === 'visao' ? 'Visão do hotel' : pagina === 'pesquisas' ? 'Pesquisas' : pagina === 'gravacoes' ? 'Gravações'
    : pagina === 'dashboard' || (perfil === 'analista' && !pagina) ? 'Dashboard' : 'Trilhas'
  return `${nome} · HSystem Academy`
}

export default function App() {
  const estado = useEstado()
  const [sessao, setSessao] = useState(undefined)
  const [definirSenha, setDefinirSenha] = useState(LINK_DE_SENHA)
  const [erroCarga, setErroCarga] = useState(null)
  const [rota, setRota] = useState(lerRota)
  const [simulando, setSimulando] = useState(() => sessionStorage.getItem(SIMULACAO))

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s)
      if (evento === 'PASSWORD_RECOVERY') setDefinirSenha(true)
    })
    const aoMudar = () => { setRota(lerRota()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', aoMudar)
    return () => { sub.subscription.unsubscribe(); window.removeEventListener('hashchange', aoMudar) }
  }, [])

  const emailSessao = sessao?.user?.email
  useEffect(() => {
    if (!emailSessao) { limparDados(); return }
    setErroCarga(null)
    recarregar().catch((e) => setErroCarga(e.message))
  }, [emailSessao])

  function simular(hotelId) {
    if (hotelId) sessionStorage.setItem(SIMULACAO, hotelId)
    else sessionStorage.removeItem(SIMULACAO)
    setSimulando(hotelId)
    window.location.hash = hotelId ? '/' : '/visao'
  }
  async function sair() {
    sessionStorage.removeItem(SIMULACAO)
    setSimulando(null)
    await supabase.auth.signOut()
    window.location.hash = ''
  }

  // Pesquisa pública: abre sem login (#/pesquisa/<endereço>).
  if (rota[0] === 'pesquisa' && rota[1]) return <PesquisaPublica slug={rota[1]} />

  if (sessao === undefined) return <div className="centro muted">Carregando…</div>
  if (!sessao) return <Login />
  if (definirSenha) return <Login modo="nova-senha" onSenhaDefinida={() => { setDefinirSenha(false); window.location.hash = '' }} />
  if (erroCarga) return <Aviso titulo="Não foi possível carregar seus dados" texto={erroCarga} onSair={sair} />
  if (!estado.carregado) return <div className="centro muted">Carregando sua implantação…</div>

  const eu = estado.usuarios.find((u) => u.email === emailSessao.toLowerCase())
  if (!eu) return <Aviso titulo="Acesso não liberado" texto={`O e-mail ${emailSessao} não está cadastrado na implantação. Fale com seu analista.`} onSair={sair} />

  // Visão do hotel: admin e analista veem o sistema como o cliente de um hotel, só para olhar
  // (o analista só encontra os hotéis dele). As ações do cliente ficam desativadas.
  const hotelSimulado = ['admin', 'analista'].includes(eu.perfil) && simulando && estado.hoteis.find((h) => h.id === simulando)
  definirSomenteLeitura(!!hotelSimulado)
  const usuario = hotelSimulado ? { ...eu, perfil: 'cliente', hotelId: hotelSimulado.id } : eu

  const [pagina, param] = rota
  document.title = tituloDaAba(usuario.perfil, pagina)
  let conteudo
  if (usuario.perfil === 'cliente') {
    const props = { estado, usuario, hotelId: usuario.hotelId }
    conteudo =
      pagina === 'produto' ? <Produto {...props} codigo={param} />
      : pagina === 'passo' ? <Passo {...props} passoId={param} />
      : pagina === 'reuniao' ? <Reuniao {...props} numero={Number(param)} />
      : pagina === 'implantacao' ? <Jornada {...props} />
      : pagina === 'tutoriais' ? (param ? <TutoriaisProduto estado={estado} codigo={param} /> : <ListaTutoriais />)
      : pagina === 'ao-vivo' ? <AoVivo {...props} />
      : pagina === 'gravados' ? <Gravados estado={estado} gravacaoId={param} />
      : pagina === 'tutorial' ? <TutorialPasso estado={estado} passoId={param} />
      : <Inicio {...props} />
  } else if (usuario.perfil === 'analista') {
    conteudo = pagina === 'hotel' ? <Hotel estado={estado} usuario={usuario} hotelId={param} onSimular={simular} />
      : pagina === 'visao' ? <VisaoHotel estado={estado} onEscolher={simular} />
      : pagina === 'hoteis' ? <Hoteis estado={estado} usuario={usuario} />
      : <Dashboard estado={estado} usuario={usuario} />
  } else {
    conteudo =
      pagina === 'hoteis' ? <Hoteis estado={estado} usuario={usuario} todos />
      : pagina === 'analistas' ? <Analistas estado={estado} />
      : pagina === 'acessos' ? <Acessos estado={estado} />
      : pagina === 'pesquisas' ? <Pesquisas rota={rota} />
      : pagina === 'gravacoes' ? <Gravacoes estado={estado} />
      : pagina === 'visao' ? <VisaoHotel estado={estado} onEscolher={simular} />
      : pagina === 'dashboard' ? <Dashboard estado={estado} usuario={usuario} />
      : pagina === 'hotel' ? <Hotel estado={estado} usuario={usuario} hotelId={param} onSimular={simular} />
      : <Editor estado={estado} passoId={pagina === 'passo' ? param : null} />
  }

  const hotel = usuario.hotelId && estado.hoteis.find((h) => h.id === usuario.hotelId)
  const ativa = usuario.perfil === 'cliente'
    ? (['implantacao', 'produto', 'passo', 'reuniao'].includes(pagina) ? 'implantacao'
      : pagina === 'tutorial' ? 'tutoriais' : ['ao-vivo', 'tutoriais', 'gravados'].includes(pagina) ? pagina : '')
    : pagina === 'hoteis' || pagina === 'hotel' ? 'hoteis'
    : ['analistas', 'acessos', 'dashboard', 'visao', 'pesquisas', 'gravacoes'].includes(pagina) ? pagina : ''

  const nomeTela = tituloDaAba(usuario.perfil, pagina).split(' · ')[0]
  return (
    <Layout grupos={MENU[usuario.perfil] ?? []} ativa={ativa}
      titulo={hotel ? hotel.nome : nomeTela} iconeTitulo={hotel ? 'hoteis' : null}
      nome={eu.nome} papel={hotelSimulado ? 'Visão do hotel' : PAPEL[usuario.perfil]} onSair={sair}
      faixa={hotelSimulado && <FaixaVisao estado={estado} hotel={hotelSimulado} onEscolher={simular} />}>
      <SomenteLeitura.Provider value={!!hotelSimulado}>{conteudo}</SomenteLeitura.Provider>
    </Layout>
  )
}

function Aviso({ titulo, texto, onSair }) {
  return (
    <div className="centro">
      <div className="cartao login-cartao">
        <div className="login-marca"><img src="./logo.png" alt="HSystem Academy Clientes" /></div>
        <h1>{titulo}</h1>
        <p className="muted">{texto}</p>
        <button className="btn" onClick={onSair}>Sair</button>
      </div>
    </div>
  )
}
