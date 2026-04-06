import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const fmt = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

function StatusLicenca({ licenca }) {
  if (!licenca) return null

  if (licenca.tipo === 'permanente') {
    return (
      <div className="licenca-status licenca-ok">
        <span className="licenca-icone">✓</span>
        <span>Licença permanente ativa</span>
      </div>
    )
  }

  // Mensal
  const agora = new Date()
  const expira = licenca.expira_em ? new Date(licenca.expira_em) : null

  if (!expira) return null

  const diffMs = expira - agora
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const expirou = diasRestantes <= 0

  // Barra de progresso: janela de 30 dias
  const totalDias = 30
  const progresso = expirou ? 0 : Math.min(100, Math.round((diasRestantes / totalDias) * 100))

  const cor = expirou ? 'vermelho' : diasRestantes <= 5 ? 'amarelo' : 'verde'

  return (
    <div className={`licenca-status licenca-mensal licenca-${cor}`}>
      <div className="licenca-mensal-header">
        <span className="licenca-icone">{expirou ? '⚠️' : '📅'}</span>
        <span className="licenca-mensal-texto">
          {expirou
            ? 'Assinatura expirada — renove para continuar'
            : diasRestantes === 1
            ? 'Assinatura vence amanhã'
            : `Assinatura mensal — ${diasRestantes} dias restantes`}
        </span>
      </div>
      <div className="licenca-barra-fundo">
        <div
          className={`licenca-barra-progresso licenca-barra-${cor}`}
          style={{ width: `${progresso}%` }}
        />
      </div>
      {!expirou && (
        <span className="licenca-expira-em">
          Vence em {expira.toLocaleDateString('pt-BR')}
        </span>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [dados, setDados] = useState(null)
  const [licenca, setLicenca] = useState(null)

  useEffect(() => {
    window.api['comandas_indicadoresDashboard']().then((res) => {
      if (res.ok) setDados(res.data)
    })
    window.api['licenca_status']().then((res) => {
      if (res.ok) setLicenca(res.data?.licenca)
    })
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏖️ Barraca</h1>
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
        <Link to="/configuracoes" className="dashboard-btn">
          <span className="icon">⚙️</span>
          Configurações
        </Link>
      </div>

      <StatusLicenca licenca={licenca} />

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
