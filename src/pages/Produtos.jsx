import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Toast from '../components/Toast'
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'

const fmt = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const EMPTY_FORM = { id: null, nome: '', preco: '', categoria: '' }

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editando, setEditando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modalApagar, setModalApagar] = useState(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos')
  const { toasts, show } = useToast()

  async function carregar() {
    const res = await window.api['produtos_listar']()
    if (res.ok) setProdutos(res.data)
  }

  useEffect(() => { carregar() }, [])

  function iniciarEdicao(p) {
    setForm({ id: p.id, nome: p.nome, preco: String(p.preco), categoria: p.categoria || '' })
    setEditando(true)
  }

  function cancelar() {
    setForm(EMPTY_FORM)
    setEditando(false)
  }

  async function salvar(e) {
    e.preventDefault()
    const nome = form.nome.trim()
    const preco = parseFloat(form.preco.replace(',', '.'))
    if (!nome) { show('Informe o nome do produto', 'erro'); return }
    if (isNaN(preco) || preco <= 0) { show('Preço inválido. Use o formato 6,00', 'erro'); return }

    setLoading(true)
    const payload = { nome, preco, categoria: form.categoria.trim() || null }
    const res = editando
      ? await window.api['produtos_editar']({ ...payload, id: form.id })
      : await window.api['produtos_criar'](payload)
    setLoading(false)

    if (res.ok) {
      show(editando ? 'Produto atualizado' : 'Produto criado')
      cancelar()
      carregar()
    } else {
      show(res.error || 'Erro ao salvar', 'erro')
    }
  }

  async function toggleAtivo(p) {
    const res = await window.api['produtos_toggleAtivo']({ id: p.id })
    if (res.ok) {
      show(res.data.ativo ? 'Produto ativado' : 'Produto inativado')
      carregar()
    } else {
      show(res.error || 'Ocorreu um erro inesperado', 'erro')
    }
  }

  async function importarExcel() {
    const res = await window.api['produtos_importarExcel']()
    if (res.cancelado) return
    if (!res.ok) { show(res.error || 'Erro ao importar', 'erro'); return }
    const msg = `${res.importados} produto(s) importado(s)` +
      (res.erros.length > 0 ? ` · ${res.erros.length} com erro` : '')
    show(msg, res.erros.length > 0 ? 'aviso' : undefined)
    carregar()
  }

  async function confirmarApagar() {
    const p = modalApagar
    setModalApagar(null)
    const res = await window.api['produtos_apagar']({ id: p.id })
    if (res.ok) {
      show('Produto apagado')
      carregar()
    } else {
      show(res.error || 'Erro ao apagar', 'erro')
    }
  }

  const categorias = ['Todos', ...Array.from(new Set(produtos.map((p) => p.categoria || 'Sem categoria')))]
  const categoriasExistentes = Array.from(new Set(produtos.map((p) => p.categoria).filter(Boolean)))

  const produtosFiltrados = categoriaFiltro === 'Todos'
    ? produtos
    : produtos.filter((p) => (p.categoria || 'Sem categoria') === categoriaFiltro)

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="btn btn-ghost btn-sm">← Voltar</Link>
        <h1>Produtos</h1>
        <button className="btn btn-outline btn-sm" onClick={importarExcel}>
          Importar Excel
        </button>
      </div>

      <div className="card" style={{ maxWidth: 520, marginBottom: 28 }}>
        <p className="section-title">{editando ? 'Editar produto' : 'Novo produto'}</p>
        <form onSubmit={salvar}>
          <div className="form-group">
            <label>Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Refrigerante"
            />
          </div>
          <div className="form-group">
            <label>Preço (R$) *</label>
            <input
              type="text"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              placeholder="Ex: 6,00"
            />
          </div>
          <div className="form-group">
            <label>Categoria</label>
            <input
              type="text"
              list="categorias-existentes"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              placeholder="Ex: bebida"
            />
            <datalist id="categorias-existentes">
              {categoriasExistentes.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar produto'}
            </button>
            {editando && (
              <button type="button" className="btn btn-ghost" onClick={cancelar}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        {categorias.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="filtro-categoria-select"
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th className="text-right">Preço</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.length === 0 && (
              <tr><td colSpan={5} className="empty">Nenhum produto</td></tr>
            )}
            {produtosFiltrados.map((p) => (
              <tr key={p.id} style={{ opacity: p.ativo ? 1 : 0.5 }}>
                <td className="font-bold">{p.nome}</td>
                <td>{p.categoria || '—'}</td>
                <td className="text-right">{fmt(p.preco)}</td>
                <td>
                  <span className={p.ativo ? 'badge badge-aberta' : 'badge badge-fechada'}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => iniciarEdicao(p)}
                    >
                      Editar
                    </button>
                    <button
                      className={`btn btn-sm ${p.ativo ? 'btn-warning' : 'btn-ghost'}`}
                      onClick={() => toggleAtivo(p)}
                    >
                      {p.ativo ? 'Inativar' : 'Ativar'}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setModalApagar(p)}
                    >
                      Apagar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalApagar && (
        <Modal
          titulo="Apagar produto"
          mensagem={`Apagar "${modalApagar.nome}" permanentemente? Essa ação não pode ser desfeita.`}
          onConfirmar={confirmarApagar}
          onCancelar={() => setModalApagar(null)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
