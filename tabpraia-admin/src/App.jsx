import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Licencas from './pages/Licencas'
import { supabase } from './lib/supabase'

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [tab, setTab] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session)
      setCarregando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    setAuthed(false)
  }

  if (carregando) return null

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  return (
    <div className="layout">
      <nav className="nav">
        <span className="brand">TabPraia Admin</span>
        <div className="nav-tabs">
          <button className={tab === 'dashboard' ? 'nav-tab active' : 'nav-tab'} onClick={() => setTab('dashboard')}>Dashboard</button>
          <button className={tab === 'licencas' ? 'nav-tab active' : 'nav-tab'} onClick={() => setTab('licencas')}>Licenças</button>
        </div>
        <button className="btn-sair" onClick={sair}>Sair</button>
      </nav>
      <main className="main">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'licencas' && <Licencas />}
      </main>
    </div>
  )
}
