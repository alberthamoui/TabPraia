import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const fmt = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export default function Fechamento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toasts, show } = useToast()

  const [comanda, setComanda] = useState(null)
  const [itens, setItens] = useState([])
  const [formaPagamento, setFormaPagamento] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function carregar() {
      const [rc, ri] = await Promise.all([
        window.api['comandas_buscarPorId']({ id: Number(id) }),
        window.api['itens_listarPorComanda']({ comanda_id: Number(id) }),
      ])
      if (rc.ok) {
        if (rc.data?.status === 'fechada') {
          navigate(`/comanda/${id}`)
          return
        }
        setComanda(rc.data)
      }
      if (ri.ok) setItens(ri.data)
    }
    carregar()
  }, [id])

  async function confirmar() {
    if (!formaPagamento) { show('Selecione a forma de pagamento', 'erro'); return }
    setLoading(true)
    const res = await window.api['comandas_fechar']({ id: Number(id), forma_pagamento: formaPagamento })
    setLoading(false)
    if (res.ok) {
      navigate('/comandas-abertas')
    } else {
      show(res.error || 'Erro ao fechar comanda', 'erro')
    }
  }

  if (!comanda) return <div className="page"><p>Carregando…</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <Link to={`/comanda/${id}`} className="btn btn-ghost btn-sm">← Voltar</Link>
        <h1>Fechar Conta — {comanda.nome_cliente}</h1>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th className="text-right">Unit.</th>
              <th className="text-right">Qtd</th>
              <th className="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <td>{item.nome_produto_snapshot}</td>
                <td className="text-right">{fmt(item.preco_unitario_snapshot)}</td>
                <td className="text-right">{item.quantidade}</td>
                <td className="text-right font-bold">{fmt(item.subtotal)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={3}>Total</td>
              <td className="text-right text-lg">{fmt(comanda.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="section-title">Forma de pagamento *</p>
      <div className="pagamento-opts">
        <div
          className={`pagamento-opt ${formaPagamento === 'pix' ? 'selecionado' : ''}`}
          onClick={() => setFormaPagamento('pix')}
        >
          <span className="pg-icon">📱</span>
          Pix
        </div>
        <div
          className={`pagamento-opt ${formaPagamento === 'dinheiro' ? 'selecionado' : ''}`}
          onClick={() => setFormaPagamento('dinheiro')}
        >
          <span className="pg-icon">💵</span>
          Dinheiro
        </div>
      </div>

      <button
        className="btn btn-success btn-lg"
        onClick={confirmar}
        disabled={loading || !formaPagamento}
      >
        {loading ? 'Processando…' : '✅ Confirmar Recebimento'}
      </button>

      <Toast toasts={toasts} />
    </div>
  )
}
