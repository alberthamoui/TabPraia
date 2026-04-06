import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const fmt = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export default function ResumoDia() {
  const [dados, setDados] = useState(null)
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const [rd, rp] = await Promise.all([
        window.api['comandas_indicadoresDia'](),
        window.api['comandas_produtosMaisVendidosDia'](),
      ])
      if (rd.ok) setDados(rd.data)
      if (rp.ok) setRanking(rp.data)
      setLoading(false)
    }
    carregar()
  }, [])

  if (loading) return <div className="page"><p>Carregando…</p></div>

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="btn btn-ghost btn-sm">← Voltar</Link>
        <h1>Resumo do Dia</h1>
      </div>

      <p style={{ marginBottom: 20, color: '#555', textTransform: 'capitalize' }}>{hoje}</p>

      <div className="indicadores" style={{ marginBottom: 28 }}>
        <div className="indicador">
          <div className="indicador-label">Total vendido</div>
          <div className="indicador-valor">{fmt(dados?.total_vendido)}</div>
        </div>
        <div className="indicador">
          <div className="indicador-label">Recebido em Pix</div>
          <div className="indicador-valor verde">{fmt(dados?.total_pix)}</div>
        </div>
        <div className="indicador">
          <div className="indicador-label">Recebido em dinheiro</div>
          <div className="indicador-valor amarelo">{fmt(dados?.total_dinheiro)}</div>
        </div>
        <div className="indicador">
          <div className="indicador-label">Comandas fechadas</div>
          <div className="indicador-valor">{dados?.fechadas_hoje ?? 0}</div>
        </div>
        <div className="indicador">
          <div className="indicador-label">Comandas abertas</div>
          <div className="indicador-valor">{dados?.abertas_total ?? 0}</div>
        </div>
      </div>

      <p className="section-title">Produtos mais vendidos</p>
      <div className="card">
        {ranking.length === 0 ? (
          <p className="empty">Nenhuma venda hoje</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th className="text-right">Qtd vendida</th>
                <th className="text-right">Total arrecadado</th>
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
    </div>
  )
}
