import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const fmt = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

function StatusLicenca({ licenca }) {
  if (!licenca) return null

  if (licenca.tipo === 'permanente') {
    return (
      <div className="licenca-pill licenca-pill-verde" title="Licença permanente ativa">
        ✓ Permanente
      </div>
    )
  }

  // Mensal sem data de vencimento definida
  const expira = licenca.expira_em ? new Date(licenca.expira_em) : null
  if (!expira) {
    return (
      <div className="licenca-pill licenca-pill-verde" title="Assinatura mensal ativa">
        ✓ Mensal ativa
      </div>
    )
  }

  const agora = new Date()
  const diasRestantes = Math.ceil((expira - agora) / (1000 * 60 * 60 * 24))
  const expirou = diasRestantes <= 0
  const progresso = expirou ? 0 : Math.min(100, Math.round((diasRestantes / 30) * 100))
  const cor = expirou ? 'vermelho' : diasRestantes <= 5 ? 'amarelo' : 'verde'

  const label = expirou
    ? '⚠️ Assinatura expirada'
    : diasRestantes === 1
    ? '📅 Vence amanhã'
    : `📅 ${diasRestantes} dias`

  const titulo = expirou
    ? 'Assinatura expirada — renove para continuar'
    : `Vence em ${expira.toLocaleDateString('pt-BR')}`

  return (
    <div className={`licenca-pill licenca-pill-${cor}`} title={titulo}>
      <span>{label}</span>
      <div className="licenca-pill-barra-fundo">
        <div
          className={`licenca-pill-barra licenca-barra-${cor}`}
          style={{ width: `${progresso}%` }}
        />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [dados, setDados] = useState(null)
  const [licenca, setLicenca] = useState(null)
  const [nomeBarraca, setNomeBarraca] = useState('Barraca')

  useEffect(() => {
    window.api['comandas_indicadoresDashboard']().then((res) => {
      if (res.ok) setDados(res.data)
    })
    window.api['licenca_status']().then((res) => {
      if (res.ok) setLicenca(res.data?.licenca)
    })
    window.api['pix_obterConfig']().then((res) => {
      if (res.ok && res.data?.nome) setNomeBarraca(res.data.nome)
    })
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏖️ Barraca do {nomeBarraca}</h1>
        <StatusLicenca licenca={licenca} />
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
