import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Toast from '../components/Toast'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const fmt = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-BR') : ''

export default function Comanda() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toasts, show } = useToast()

  const [comanda, setComanda] = useState(null)
  const [itens, setItens] = useState([])
  const [produtos, setProdutos] = useState([])
  const [modalRemover, setModalRemover] = useState(null)
  const [modalDeletar, setModalDeletar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos')

  async function carregar() {
    const [rc, ri, rp] = await Promise.all([
      window.api['comandas_buscarPorId']({ id: Number(id) }),
      window.api['itens_listarPorComanda']({ comanda_id: Number(id) }),
      window.api['produtos_listarAtivos'](),
    ])
    if (rc.ok) setComanda(rc.data)
    if (ri.ok) setItens(ri.data)
    if (rp.ok) setProdutos(rp.data)
  }

  useEffect(() => { carregar() }, [id])

  async function adicionarProduto(produto_id) {
    if (comanda?.status === 'fechada') { show('Comanda fechada', 'erro'); return }
    setLoading(true)
    const res = await window.api['itens_adicionar']({ comanda_id: Number(id), produto_id })
    if (res.ok) {
      setItens(res.data)
      const rc = await window.api['comandas_buscarPorId']({ id: Number(id) })
      if (rc.ok) setComanda(rc.data)
    } else {
      show(res.error || 'Erro ao adicionar item', 'erro')
    }
    setLoading(false)
  }

  async function alterarQtd(item, delta) {
    const novaQtd = item.quantidade + delta
    if (novaQtd < 1) { setModalRemover(item); return }
    const res = await window.api['itens_atualizarQuantidade']({
      id: item.id,
      quantidade: novaQtd,
      comanda_id: Number(id),
    })
    if (res.ok) {
      setItens(res.data)
      const rc = await window.api['comandas_buscarPorId']({ id: Number(id) })
      if (rc.ok) setComanda(rc.data)
    } else {
      show(res.error || 'Ocorreu um erro inesperado', 'erro')
    }
  }

  async function confirmarRemover() {
    const item = modalRemover
    setModalRemover(null)
    const res = await window.api['itens_remover']({ id: item.id, comanda_id: Number(id) })
    if (res.ok) {
      setItens(res.data)
      const rc = await window.api['comandas_buscarPorId']({ id: Number(id) })
      if (rc.ok) setComanda(rc.data)
      show('Item removido')
    } else {
      show(res.error || 'Erro ao remover', 'erro')
    }
  }

  if (!comanda) return <div className="page"><p>Carregando…</p></div>

  const fechada = comanda.status === 'fechada'

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/comandas-abertas" className="btn btn-ghost btn-sm">← Voltar</Link>
        <h1>{comanda.nome_cliente}</h1>
        <span className={`badge badge-${comanda.status}`}>{comanda.status}</span>
      </div>

      {comanda.observacao && (
        <p style={{ marginBottom: 16, color: '#555' }}>📍 {comanda.observacao}</p>
      )}
      <p style={{ marginBottom: 24, fontSize: '0.88rem', color: '#888' }}>
        Aberta em {fmtData(comanda.criada_em)}
      </p>

      {!fechada && (
        <>
          <p className="section-title">Adicionar produto</p>
          {(() => {
            const categorias = ['Todos', ...Array.from(new Set(produtos.map((p) => p.categoria || 'Sem categoria')))]
            const produtosFiltrados = categoriaFiltro === 'Todos'
              ? produtos
              : produtos.filter((p) => (p.categoria || 'Sem categoria') === categoriaFiltro)
            return (
              <>
                {categorias.length > 1 && (
                  <div className="categoria-tabs" style={{ marginBottom: 12 }}>
                    {categorias.map((cat) => (
                      <button
                        key={cat}
                        className={`btn btn-sm ${categoriaFiltro === cat ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setCategoriaFiltro(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                <div className="produtos-grid">
                  {produtosFiltrados.map((p) => (
                    <button
                      key={p.id}
                      className="produto-rapido"
                      onClick={() => adicionarProduto(p.id)}
                      disabled={loading}
                    >
                      {p.nome}
                      <span className="preco">{fmt(p.preco)}</span>
                    </button>
                  ))}
                </div>
              </>
            )
          })()}
        </>
      )}

      <p className="section-title">Itens consumidos</p>
      <div className="card" style={{ marginBottom: 20 }}>
        {itens.length === 0 ? (
          <p className="empty">Nenhum item ainda</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th className="text-right">Unit.</th>
                <th className="text-right">Qtd</th>
                <th className="text-right">Subtotal</th>
                {!fechada && <th></th>}
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome_produto_snapshot}</td>
                  <td className="text-right">{fmt(item.preco_unitario_snapshot)}</td>
                  <td className="text-right">
                    {!fechada ? (
                      <div className="qty-ctrl">
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => alterarQtd(item, -1)}
                        >−</button>
                        <span>{item.quantidade}</span>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => alterarQtd(item, +1)}
                        >+</button>
                      </div>
                    ) : (
                      item.quantidade
                    )}
                  </td>
                  <td className="text-right font-bold">{fmt(item.subtotal)}</td>
                  {!fechada && (
                    <td>
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={() => setModalRemover(item)}
                        title="Remover item"
                      >✕</button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan={!fechada ? 3 : 3}>Total</td>
                <td className="text-right">{fmt(comanda.total)}</td>
                {!fechada && <td></td>}
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {!fechada && (
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-success btn-lg"
            onClick={() => navigate(`/fechamento/${id}`)}
          >
            💰 Fechar Conta
          </button>
        </div>
      )}

      {fechada && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          {comanda.forma_pagamento && (
            <p>
              Pago via <span className={`badge badge-${comanda.forma_pagamento}`}>{comanda.forma_pagamento}</span>
              {comanda.fechada_em && <> em {fmtData(comanda.fechada_em)}</>}
            </p>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => setModalDeletar(true)}>
            🗑️ Apagar do histórico
          </button>
        </div>
      )}

      {modalRemover && (
        <Modal
          titulo="Remover item"
          mensagem={`Remover "${modalRemover.nome_produto_snapshot}" da comanda?`}
          onConfirmar={confirmarRemover}
          onCancelar={() => setModalRemover(null)}
        />
      )}

      {modalDeletar && (
        <Modal
          titulo="Apagar comanda"
          mensagem={`Apagar definitivamente a comanda de ${comanda.nome_cliente}? Essa ação não pode ser desfeita.`}
          onConfirmar={async () => {
            setModalDeletar(false)
            const res = await window.api['comandas_deletar']({ id: Number(id) })
            if (res.ok) {
              navigate('/historico')
            } else {
              show(res.error || 'Erro ao apagar comanda', 'erro')
            }
          }}
          onCancelar={() => setModalDeletar(false)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
