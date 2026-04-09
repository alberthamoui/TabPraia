import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function gerarChave() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`
}

const FORM_VAZIO = { cliente_nome: '', cliente_email: '', tipo: 'permanente', expira_em: '' }

export default function Licencas() {
  const [licencas, setLicencas] = useState([])
  const [filtro, setFiltro] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [chavGerada, setChavGerada] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [copiado, setCopiado] = useState(null)
  const [erroForm, setErroForm] = useState('')

  async function carregar() {
    const { data } = await supabase.from('licencas').select('*').order('criada_em', { ascending: false })
    if (data) setLicencas(data)
  }

  useEffect(() => { carregar() }, [])

  function abrirModal() {
    setForm(FORM_VAZIO)
    setChavGerada(gerarChave())
    setModal(true)
  }

  async function criarLicenca(e) {
    e.preventDefault()
    setErroForm('')

    const nome = form.cliente_nome.trim()
    const email = form.cliente_email.trim()

    if (nome && nome.length > 100) {
      setErroForm('Nome deve ter no máximo 100 caracteres.')
      return
    }
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) {
      setErroForm('E-mail inválido.')
      return
    }

    setSalvando(true)
    const payload = {
      chave: chavGerada,
      tipo: form.tipo,
      status: 'ativa',
      cliente_nome: form.cliente_nome.trim() || null,
      cliente_email: form.cliente_email.trim() || null,
      expira_em: form.tipo === 'mensal' && form.expira_em ? form.expira_em : null,
    }
    const { error } = await supabase.from('licencas').insert(payload)
    setSalvando(false)
    if (!error) { setModal(false); carregar() }
  }

  async function alterarStatus(id, novoStatus) {
    await supabase.from('licencas').update({ status: novoStatus }).eq('id', id)
    carregar()
  }

  async function resetarHardware(id) {
    await supabase.from('licencas').update({ hardware_id: null, ativada_em: null }).eq('id', id)
    carregar()
  }

  function copiarChave(chave) {
    navigator.clipboard.writeText(chave)
    setCopiado(chave)
    setTimeout(() => setCopiado(null), 2000)
  }

  const filtradas = licencas.filter(l =>
    !filtro ||
    l.chave.includes(filtro.toUpperCase()) ||
    l.cliente_nome?.toLowerCase().includes(filtro.toLowerCase()) ||
    l.cliente_email?.toLowerCase().includes(filtro.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Licenças</h2>
        <button className="btn-primary" onClick={abrirModal}>+ Nova Licença</button>
      </div>

      <input
        className="busca"
        type="text"
        placeholder="Buscar por chave, nome ou e-mail..."
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Chave</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Expira em</th>
              <th>Ativada em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map(l => (
              <tr key={l.id}>
                <td>
                  <span className="chave">{l.chave}</span>
                  <button className="btn-icon" onClick={() => copiarChave(l.chave)} title="Copiar">
                    {copiado === l.chave ? '✓' : '⧉'}
                  </button>
                </td>
                <td>
                  <div>{l.cliente_nome || '—'}</div>
                  <div className="sub">{l.cliente_email || ''}</div>
                </td>
                <td><span className={`badge badge-${l.tipo === 'permanente' ? 'azul' : 'roxo'}`}>{l.tipo}</span></td>
                <td><span className={`badge badge-${l.status === 'ativa' ? 'verde' : l.status === 'revogada' ? 'vermelho' : 'cinza'}`}>{l.status}</span></td>
                <td>{l.expira_em ? new Date(l.expira_em).toLocaleDateString('pt-BR') : '—'}</td>
                <td>{l.ativada_em ? new Date(l.ativada_em).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="acoes">
                  {l.status === 'ativa'
                    ? <button className="btn-sm btn-danger" onClick={() => alterarStatus(l.id, 'revogada')}>Revogar</button>
                    : <button className="btn-sm btn-success" onClick={() => alterarStatus(l.id, 'ativa')}>Reativar</button>
                  }
                  {l.hardware_id && (
                    <button className="btn-sm btn-ghost" onClick={() => resetarHardware(l.id)} title="Libera a chave para ativar em outro computador">Reset PC</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nova Licença</h3>
            <form onSubmit={criarLicenca}>
              <div className="field">
                <label>Chave gerada</label>
                <div className="chave-gerada">
                  <span>{chavGerada}</span>
                  <button type="button" className="btn-icon" onClick={() => setChavGerada(gerarChave())}>↻</button>
                </div>
              </div>
              <div className="field">
                <label>Nome do cliente</label>
                <input type="text" value={form.cliente_nome} onChange={e => setForm(f => ({ ...f, cliente_nome: e.target.value }))} />
              </div>
              <div className="field">
                <label>E-mail do cliente</label>
                <input type="email" value={form.cliente_email} onChange={e => setForm(f => ({ ...f, cliente_email: e.target.value }))} />
              </div>
              <div className="field">
                <label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="permanente">Permanente</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
              {form.tipo === 'mensal' && (
                <div className="field">
                  <label>Expira em</label>
                  <input type="date" value={form.expira_em} onChange={e => setForm(f => ({ ...f, expira_em: e.target.value }))} required />
                </div>
              )}
              {erroForm && <p className="erro">{erroForm}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Criando…' : 'Criar Licença'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
