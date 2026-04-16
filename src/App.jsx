import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Ativacao from './pages/Ativacao'
import Dashboard from './pages/Dashboard'
import NovaComanda from './pages/NovaComanda'
import Comanda from './pages/Comanda'
import ComandasAbertas from './pages/ComandasAbertas'
import Fechamento from './pages/Fechamento'
import Historico from './pages/Historico'
import Resumo from './pages/Resumo'
import Produtos from './pages/Produtos'
import Configuracoes from './pages/Configuracoes'

export default function App() {
  // null = verificando | true = licenciado | false = não licenciado
  const [licenciado, setLicenciado] = useState(null)

  useEffect(() => {
    window.api
      .licenca_status()
      .then((res) => setLicenciado(res.ok && res.data?.ativo === true))
      .catch(() => setLicenciado(false))
  }, [])

  if (licenciado === null) {
    return (
      <div className="verificando-licenca">
        Verificando licença…
      </div>
    )
  }

  if (!licenciado) {
    return <Ativacao onAtivado={() => setLicenciado(true)} />
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/nova-comanda" element={<NovaComanda />} />
        <Route path="/comanda/:id" element={<Comanda />} />
        <Route path="/comandas-abertas" element={<ComandasAbertas />} />
        <Route path="/fechamento/:id" element={<Fechamento />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/resumo" element={<Resumo />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/configuracoes" element={<Configuracoes onDesativado={() => setLicenciado(false)} />} />
      </Routes>
    </HashRouter>
  )
}
