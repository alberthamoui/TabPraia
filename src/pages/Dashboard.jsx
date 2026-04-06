import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const fmt = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export default function Dashboard() {
  const [dados, setDados] = useState(null)

  useEffect(() => {
    window.api['comandas_indicadoresDashboard']().then((res) => {
      if (res.ok) setDados(res.data)
    })
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏖️ Barraca do João</h1>
      </div>

      <div className="dashboard-grid">
        <Link to="/nova-comanda" className="dashboard-btn">
          <span className="icon">➕</span>
          Nova Comanda
        </Link>
        <Link to="/comandas-abertas" className="dashboard-btn">
          <span className="icon">📋</span>
          Comandas em Aberto
        </Link>
        <Link to="/comandas-abertas" className="dashboard-btn">
          <span className="icon">💰</span>
          Fechar Conta
        </Link>
        <Link to="/produtos" className="dashboard-btn">
          <span className="icon">🛒</span>
          Produtos
        </Link>
        <Link to="/resumo-dia" className="dashboard-btn">
          <span className="icon">📊</span>
          Resumo do Dia
        </Link>
        <Link to="/historico" className="dashboard-btn">
          <span className="icon">📜</span>
          Histórico
        </Link>
      </div>

      <p className="section-title">Indicadores de hoje</p>
      <div className="indicadores">
        <div className="indicador">
          <div className="indicador-label">Comandas abertas</div>
          <div className="indicador-valor">{dados?.abertas ?? '—'}</div>
        </div>
        <div className="indicador">
          <div className="indicador-label">Total vendido hoje</div>
          <div className="indicador-valor">{dados ? fmt(dados.total_vendido) : '—'}</div>
        </div>
        <div className="indicador">
          <div className="indicador-label">Recebido em Pix</div>
          <div className="indicador-valor verde">{dados ? fmt(dados.total_pix) : '—'}</div>
        </div>
        <div className="indicador">
          <div className="indicador-label">Recebido em dinheiro</div>
          <div className="indicador-valor amarelo">{dados ? fmt(dados.total_dinheiro) : '—'}</div>
        </div>
      </div>
    </div>
  )
}
