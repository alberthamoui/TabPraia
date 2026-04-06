import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

export default function NovaComanda() {
  const navigate = useNavigate()
  const { toasts, show } = useToast()
  const [nome, setNome] = useState('')
  const [obs, setObs] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const nomeTrim = nome.trim()
    if (!nomeTrim) { show('Informe o nome do cliente', 'erro'); return }

    setLoading(true)
    const existe = await window.api['comandas_clienteTemAberta']({ nome_cliente: nomeTrim })
    if (existe.ok && existe.data) {
      show('Este cliente já tem uma comanda aberta', 'erro')
      setLoading(false)
      return
    }

    const res = await window.api['comandas_criar']({ nome_cliente: nomeTrim, observacao: obs.trim() || null })
    setLoading(false)
    if (res.ok) {
      navigate(`/comanda/${res.data.id}`)
    } else {
      show(res.error || 'Erro ao criar comanda', 'erro')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="btn btn-ghost btn-sm">← Voltar</Link>
        <h1>Nova Comanda</h1>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome do cliente *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Maria"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Observação (opcional)</label>
            <input
              type="text"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex: guarda-sol 8, cadeira azul"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Salvando…' : 'Abrir Comanda'}
            </button>
            <Link to="/" className="btn btn-ghost">Cancelar</Link>
          </div>
        </form>
      </div>

      <Toast toasts={toasts} />
    </div>
  )
}
