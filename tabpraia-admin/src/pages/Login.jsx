import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setCarregando(true)
    setErro(false)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setCarregando(false)
    if (error) {
      setErro(true)
      setSenha('')
    } else {
      onLogin()
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={entrar}>
        <h1 className="login-title">TabPraia Admin</h1>
        <div className="field">
          <label>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErro(false) }}
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={e => { setSenha(e.target.value); setErro(false) }}
            required
          />
        </div>
        {erro && <p className="erro">E-mail ou senha incorretos.</p>}
        <button className="btn-primary" type="submit" disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
