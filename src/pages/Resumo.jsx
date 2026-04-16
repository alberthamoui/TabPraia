import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const fmt = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const PERIODOS = [
  { label: 'Hoje', valor: 'hoje' },
  { label: 'Ontem', valor: 'ontem' },
  { label: 'Esta semana', valor: 'semana' },
  { label: 'Este mês', valor: 'mes' },
  { label: 'Geral', valor: 'geral' },
  { label: 'Personalizado', valor: 'custom' },
]

function getDatas(periodo, customDe, customAte) {
  const hoje = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)

  if (periodo === 'hoje') return { de: iso(hoje), ate: iso(hoje) }

  if (periodo === 'ontem') {
    const d = new Date(hoje)
    d.setDate(d.getDate() - 1)
    return { de: iso(d), ate: iso(d) }
  }

  if (periodo === 'semana') {
    const d = new Date(hoje)
    const dia = d.getDay()
    d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1)) // segunda-feira
    return { de: iso(d), ate: iso(hoje) }
  }

  if (periodo === 'mes') {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    return { de: iso(d), ate: iso(hoje) }
  }

  if (periodo === 'geral') return { de: null, ate: null }

  if (periodo === 'custom') return { de: customDe || null, ate: customAte || null }

  return { de: null, ate: null }
}

function labelPeriodo(periodo, customDe, customAte) {
  if (periodo === 'custom' && customDe && customAte) {
    const fmt = (s) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')
    return `${fmt(customDe)} até ${fmt(customAte)}`
  }
  return PERIODOS.find((p) => p.valor === periodo)?.label ?? ''
}

export default function Resumo() {
  const [periodo, setPeriodo] = useState('hoje')
  const [customDe, setCustomDe] = useState('')
  const [customAte, setCustomAte] = useState('')
  const [dados, setDados] = useState(null)
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(false)

  async function carregar(p, de, ate) {
    setLoading(true)
    const datas = getDatas(p, de, ate)
    const [rd, rp] = await Promise.all([
      window.api['comandas_indicadoresPeriodo'](datas),
      window.api['comandas_produtosMaisVendidosPeriodo'](datas),
    ])
    if (rd.ok) setDados(rd.data)
    if (rp.ok) setRanking(rp.data)
    setLoading(false)
  }

  useEffect(() => {
    carregar(periodo, customDe, customAte)
  }, [])

  function selecionarPeriodo(val) {
    setPeriodo(val)
    if (val !== 'custom') carregar(val, customDe, customAte)
  }

  function aplicarCustom() {
    if (customDe && customAte) carregar('custom', customDe, customAte)
  }

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="btn btn-ghost btn-sm">← Voltar</Link>
        <h1>Resumo</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {PERIODOS.map((p) => (
          <button
            key={p.valor}
            className={`btn btn-sm ${periodo === p.valor ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => selecionarPeriodo(p.valor)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {periodo === 'custom' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            type="date"
            value={customDe}
            onChange={(e) => setCustomDe(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border, #ddd)' }}
          />
          <span style={{ color: '#888' }}>até</span>
          <input
            type="date"
            value={customAte}
            onChange={(e) => setCustomAte(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border, #ddd)' }}
          />
          <button
            className="btn btn-primary btn-sm"
            disabled={!customDe || !customAte}
            onClick={aplicarCustom}
          >
            Aplicar
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#888' }}>Carregando…</p>
      ) : (
        <>
          <p style={{ marginBottom: 16, color: '#666', fontWeight: 500 }}>
            {labelPeriodo(periodo, customDe, customAte)}
          </p>

          <div className="indicadores" style={{ marginBottom: 28 }}>
            <div className="indicador">
              <div className="indicador-label">Total vendido</div>
              <div className="indicador-valor">{fmt(dados?.total_vendido)}</div>
            </div>
            <div className="indicador">
              <div className="indicador-label">Total recebido</div>
              <div className="indicador-valor verde">{fmt(dados?.total_recebido)}</div>
            </div>
            <div className="indicador">
              <div className="indicador-label">Comandas fechadas</div>
              <div className="indicador-valor">{dados?.fechadas ?? 0}</div>
            </div>
            <div className="indicador">
              <div className="indicador-label">Comandas abertas</div>
              <div className="indicador-valor">{dados?.abertas ?? 0}</div>
            </div>
          </div>

          <p className="section-title">Produtos mais vendidos</p>
          <div className="card">
            {ranking.length === 0 ? (
              <p className="empty">Nenhuma venda no período</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Produto</th>
                    <th className="text-right">Qtd</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((item, i) => (
                    <tr key={item.nome}>
                      <td>{i + 1}º</td>
                      <td className="font-bold">{item.nome}</td>
                      <td className="text-right">{item.quantidade}</td>
                      <td className="text-right">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
