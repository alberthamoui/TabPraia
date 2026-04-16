import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const fmt = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR') : '—'

export default function Historico() {
  const [comandas, setComandas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalLimpar, setModalLimpar] = useState(false)
  const navigate = useNavigate()
  const { toasts, show } = useToast()

  function carregar() {
    window.api['comandas_listarFechadas']().then((res) => {
      if (res.ok) setComandas(res.data)
      setLoading(false)
    })
  }

  useEffect(() => { carregar() }, [])

  async function confirmarLimpar() {
    setModalLimpar(false)
    const res = await window.api['comandas_limparHistorico']()
    if (res.ok) {
      show(`${res.data.apagadas} comanda(s) apagada(s)`)
      carregar()
    } else {
      show(res.error || 'Erro ao limpar histórico', 'erro')
    }
  }

  if (loading) return <div className="page"><p>Carregando…</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="btn btn-ghost btn-sm">← Voltar</Link>
        <h1>Histórico</h1>
        {comandas.length > 0 && (
          <button className="btn btn-danger btn-sm" onClick={() => setModalLimpar(true)}>
            Limpar histórico
          </button>
        )}
      </div>

      {comandas.length === 0 ? (
        <div className="card">
          <p className="empty">Nenhuma comanda fechada</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Fechada em</th>
                <th>Pagamento</th>
                <th className="text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {comandas.map((c) => (
                <tr key={c.id}>
                  <td className="font-bold">{c.nome_cliente}</td>
                  <td>{fmtData(c.fechada_em)}</td>
                  <td>
                    {c.forma_pagamento && (
                      <span className={`badge badge-${c.forma_pagamento}`}>
                        {c.forma_pagamento}
                      </span>
                    )}
                  </td>
                  <td className="text-right font-bold">{fmt(c.total)}</td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate(`/comanda/${c.id}`)}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modalLimpar && (
        <Modal
          titulo="Limpar histórico"
          mensagem="Apagar todas as comandas fechadas permanentemente? Essa ação não pode ser desfeita."
          onConfirmar={confirmarLimpar}
          onCancelar={() => setModalLimpar(false)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
