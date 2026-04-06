import { HashRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import NovaComanda from './pages/NovaComanda'
import Comanda from './pages/Comanda'
import ComandasAbertas from './pages/ComandasAbertas'
import Fechamento from './pages/Fechamento'
import Historico from './pages/Historico'
import ResumoDia from './pages/ResumoDia'
import Produtos from './pages/Produtos'
import Configuracoes from './pages/Configuracoes'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/nova-comanda" element={<NovaComanda />} />
        <Route path="/comanda/:id" element={<Comanda />} />
        <Route path="/comandas-abertas" element={<ComandasAbertas />} />
        <Route path="/fechamento/:id" element={<Fechamento />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/resumo-dia" element={<ResumoDia />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Routes>
    </HashRouter>
  )
}
