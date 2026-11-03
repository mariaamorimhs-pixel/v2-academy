// Ícones de traço do menu lateral (desenho no estilo Lucide, 24×24, cor do texto).
const TRACOS = {
  inicio: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>,
  implantacao: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16" /></>,
  dashboard: <><path d="M3 3v18h18" /><path d="M7 16v-4" /><path d="M12 16V8" /><path d="M17 16v-7" /></>,
  hoteis: <><rect x="4" y="2.5" width="16" height="19" rx="1.5" /><path d="M9 21.5v-4h6v4" /><path d="M8.5 7h.01M12 7h.01M15.5 7h.01M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 15h.01M15.5 15h.01" /></>,
  visao: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  conteudo: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M9 7h7M9 11h5" /></>,
  pesquisas: <><rect x="5" y="3.5" width="14" height="18" rx="2" /><path d="M9 3.5V2.5h6v1" /><path d="M9 10h6M9 14h6M9 18h3" /></>,
  analistas: <><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0 1 12 0v1" /><path d="M16 4a4 4 0 0 1 0 8" /><path d="M22 21v-1a6 6 0 0 0-4-5.6" /></>,
  acessos: <><path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6z" /><path d="m9 12 2 2 4-4" /></>,
  recolher: <><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></>,
  expandir: <><path d="m13 17 5-5-5-5" /><path d="m6 17 5-5-5-5" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  fechar: <><path d="M18 6 6 18M6 6l12 12" /></>,
  sair: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  usuario: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></>,
}

export function Icone({ nome, tamanho = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {TRACOS[nome]}
    </svg>
  )
}
