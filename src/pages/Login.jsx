import { useState } from 'react'
import { supabase, ERRO_DO_LINK } from '../supabase.js'

// Login por e-mail e senha. Não há cadastro aberto: quem está na implantação recebe um convite por e-mail
// e cria a própria senha; quem esqueceu pede um link novo.
export default function Login({ modo: modoInicial = 'entrar', onSenhaDefinida }) {
  const [modo, setModo] = useState(modoInicial)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState(
    ERRO_DO_LINK ? { tipo: 'erro', texto: 'Este link expirou ou já foi usado. Peça um novo em "Primeiro acesso ou esqueci minha senha".' } : null,
  )
  const [carregando, setCarregando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setCarregando(true); setMsg(null)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
      if (error) setMsg({ tipo: 'erro', texto: error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message })
    } else if (modo === 'link') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + window.location.pathname })
      setMsg(error ? { tipo: 'erro', texto: error.message } : { tipo: 'ok', texto: 'Se este e-mail estiver cadastrado, você vai receber um link para criar sua senha.' })
    } else {
      const { error } = await supabase.auth.updateUser({ password: senha })
      if (error) setMsg({ tipo: 'erro', texto: error.message })
      else onSenhaDefinida?.()
    }
    setCarregando(false)
  }

  const textos = {
    entrar: { titulo: 'Boas-vindas à sua implantação', sub: 'Siga os treinamentos no seu ritmo e agende as reuniões com seu analista quando cada módulo terminar.', botao: 'Entrar' },
    link: { titulo: 'Primeiro acesso ou nova senha', sub: 'Informe seu e-mail. Enviamos um link para você criar sua senha.', botao: 'Enviar link' },
    'nova-senha': { titulo: 'Crie sua senha', sub: 'Escolha uma senha com pelo menos 8 caracteres.', botao: 'Salvar senha e entrar' },
  }[modo]

  return (
    <div className="login">
      <form className="cartao login-cartao" onSubmit={enviar}>
        <div className="login-marca"><img src="./logo.png" alt="HSystem Academy Clientes" /></div>
        <h1>{textos.titulo}</h1>
        <p className="muted">{textos.sub}</p>
        {modo !== 'nova-senha' && (
          <label>E-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus autoComplete="email" /></label>
        )}
        {modo !== 'link' && (
          <label>{modo === 'nova-senha' ? 'Nova senha' : 'Senha'}
            <input type="password" required minLength={modo === 'nova-senha' ? 8 : undefined} value={senha} onChange={(e) => setSenha(e.target.value)}
              autoFocus={modo === 'nova-senha'} autoComplete={modo === 'nova-senha' ? 'new-password' : 'current-password'} />
          </label>
        )}
        {msg && <div className={`alerta ${msg.tipo}`}>{msg.texto}</div>}
        <button className="btn primario" disabled={carregando}>{carregando ? 'Aguarde…' : textos.botao}</button>
        {modo === 'entrar' && <button type="button" className="link" onClick={() => { setModo('link'); setMsg(null) }}>Primeiro acesso ou esqueci minha senha</button>}
        {modo === 'link' && <button type="button" className="link" onClick={() => { setModo('entrar'); setMsg(null) }}>Voltar para o login</button>}
      </form>
    </div>
  )
}
