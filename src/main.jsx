import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { aplicarTema, temaInicial } from './tema.jsx'

aplicarTema(temaInicial()) // antes de desenhar, para não piscar no tema errado

createRoot(document.getElementById('root')).render(<App />)
