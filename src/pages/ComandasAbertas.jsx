import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const fmt = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR') : ''

export default function ComandasAbertas() {
  const [comandas, setComandas] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    window.api['comandas_listarAbertas']().then((res) => {
      if (res.ok) setComandas(res.data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="page"><p>Carregando…</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="btn btn-ghost btn-sm">← Voltar</Link>
        <h1>Comandas em Aberto</h1>
        <Link to="/nova-comanda" className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
          + Nova
        </Link>
      </div>

      {comandas.length === 0 ? (
        <div className="card">
          <p className="empty">Nenhuma comanda em aberto</p>
        </div>
      ) : (
        comandas.map((c) => (
          <div key={c.id} className="comanda-card">
            <div className="comanda-info">
              <h3>{c.nome_cliente}</h3>
              {c.observacao && <p>📍 {c.observacao}</p>}
              <p>Aberta em {fmtData(c.criada_em)}</p>
            </div>
            <div className="comanda-total">{fmt(c.total)}</div>
            <div className="comanda-acoes">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate(`/comanda/${c.id}`)}
              >
                Abrir
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={() => navigate(`/fechamento/${c.id}`)}
              >
                Fechar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
