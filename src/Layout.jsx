import { useEffect, useState } from 'react'
import { Icone } from './icones.jsx'
import { AlternarTema } from './tema.jsx'

// Layout dos produtos HSystem: menu lateral (com grupos, que recolhe para só ícones) e barra no topo.
// No celular o menu vira uma gaveta que abre por cima. A escolha de recolher fica salva neste navegador.
const CHAVE_RECOLHIDO = 'academy-menu-recolhido'
const lerRecolhido = () => { try { return localStorage.getItem(CHAVE_RECOLHIDO) === '1' } catch { return false } }

export default function Layout({ grupos, ativa, titulo, iconeTitulo, nome, papel, faixa, onSair, children }) {
  const [recolhido, setRecolhido] = useState(lerRecolhido)
  const [aberto, setAberto] = useState(false) // gaveta no celular

  useEffect(() => {
    const fechar = () => setAberto(false)
    const tecla = (e) => { if (e.key === 'Escape') setAberto(false) }
    window.addEventListener('hashchange', fechar)
    window.addEventListener('keydown', tecla)
    return () => { window.removeEventListener('hashchange', fechar); window.removeEventListener('keydown', tecla) }
  }, [])

  function alternarRecolhido() {
    const novo = !recolhido
    setRecolhido(novo)
    try { localStorage.setItem(CHAVE_RECOLHIDO, novo ? '1' : '0') } catch { /* ignora */ }
  }

  return (
    <div className={`layout-lateral${recolhido ? ' recolhido' : ''}${aberto ? ' gaveta-aberta' : ''}`}>
      <a href="#conteudo" className="pular-para-conteudo">Pular para o conteúdo</a>
      <aside className="lateral" aria-label="Menu">
        <div className="lateral-topo">
          <a href="#/" className="lateral-marca" aria-label="HSystem Academy, ir para o início">
            <img className="logo-inteiro" src="./logo.png" alt="" />
            <img className="logo-simbolo" src="./simbolo.png" alt="" />
          </a>
          <button type="button" className="lateral-recolher" onClick={alternarRecolhido}
            aria-label={recolhido ? 'Abrir o menu' : 'Recolher o menu'} aria-expanded={!recolhido} title={recolhido ? 'Abrir o menu' : 'Recolher o menu'}>
            <Icone nome={recolhido ? 'expandir' : 'recolher'} />
          </button>
          <button type="button" className="lateral-fechar" onClick={() => setAberto(false)} aria-label="Fechar o menu">
            <Icone nome="fechar" />
          </button>
        </div>
        <nav className="lateral-menu" aria-label="Menu principal">
          {grupos.map((g) => (
            <div key={g.titulo} className="lateral-grupo">
              <span className="lateral-grupo-titulo">{g.titulo}</span>
              <ul>
                {g.itens.map((m) => (
                  <li key={m.rota}>
                    <a href={`#/${m.rota}`} className={ativa === m.rota ? 'ativa' : ''} aria-current={ativa === m.rota ? 'page' : undefined}
                      title={recolhido ? m.rotulo : undefined}>
                      <Icone nome={m.icone} />
                      <span className="lateral-rotulo">{m.rotulo}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <div className="lateral-fundo" onClick={() => setAberto(false)} aria-hidden="true" />

      <div className="area">
        {faixa}
        <header className="barra-topo">
          <button type="button" className="barra-topo-menu" onClick={() => setAberto(true)} aria-label="Abrir o menu" aria-expanded={aberto}>
            <Icone nome="menu" tamanho={22} />
          </button>
          <div className="barra-topo-titulo">
            {iconeTitulo && <Icone nome={iconeTitulo} />}
            <span>{titulo}</span>
          </div>
          <div className="barra-topo-acoes">
            <AlternarTema />
            <span className="barra-topo-usuario">
              <span className="barra-topo-avatar" aria-hidden="true"><Icone nome="usuario" tamanho={18} /></span>
              <span className="barra-topo-nome"><b>{nome}</b><small>{papel}</small></span>
            </span>
            <button type="button" className="btn fantasma pequeno barra-topo-sair" onClick={onSair}>
              <Icone nome="sair" tamanho={18} /><span>Sair</span>
            </button>
          </div>
        </header>
        <main className="pagina" id="conteudo" tabIndex={-1}>{children}</main>
      </div>
    </div>
  )
}
