import { useState } from 'react'

// Modo claro/escuro: a escolha fica salva neste navegador; na primeira visita segue o modo do sistema.
const CHAVE = 'academy-tema'

export function temaInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo === 'claro' || salvo === 'escuro') return salvo
  } catch { /* sem localStorage: segue o sistema */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema
}

// Botão em pílula com sol e lua, como na extranet dos produtos HSystem.
export function AlternarTema() {
  const [tema, setTema] = useState(() => document.documentElement.dataset.tema || temaInicial())
  function trocar() {
    const novo = tema === 'escuro' ? 'claro' : 'escuro'
    setTema(novo)
    aplicarTema(novo)
    try { localStorage.setItem(CHAVE, novo) } catch { /* ignora */ }
  }
  const escuro = tema === 'escuro'
  return (
    <button type="button" className="alternar-tema" onClick={trocar} aria-pressed={escuro}
      aria-label={escuro ? 'Modo escuro ativado. Mudar para o modo claro' : 'Modo claro ativado. Mudar para o modo escuro'}>
      <span className={!escuro ? 'ativo' : ''} aria-hidden="true">
        <svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="3.6" fill="currentColor" /><g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" /></g></svg>
      </span>
      <span className={escuro ? 'ativo' : ''} aria-hidden="true">
        <svg viewBox="0 0 20 20" width="16" height="16"><path d="M15.6 12.6A6.6 6.6 0 0 1 7.4 4.4a6.6 6.6 0 1 0 8.2 8.2z" fill="currentColor" /></svg>
      </span>
    </button>
  )
}
