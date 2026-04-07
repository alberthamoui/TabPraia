import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const MENSAGENS_ERRO_LICENCA = {
  chave_invalida: 'Chave inválida ou não encontrada.',
  revogada: 'Esta licença foi revogada.',
  hardware_mismatch: 'Esta chave já está ativada em outro computador.',
  expirada: 'Sua licença expirou.',
  erro_rede: 'Não foi possível conectar ao servidor.',
}

function formatarChave(valor) {
  const hex = valor.replace(/[^A-Fa-f0-9]/g, '').toUpperCase().slice(0, 16)
  const partes = hex.match(/.{1,4}/g) || []
  return partes.join('-')
}

function validarCPF(digits) {
  if (/^(\d)\1{10}$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== parseInt(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === parseInt(digits[10])
}

function validarCNPJ(digits) {
  if (/^(\d)\1{13}$/.test(digits)) return false
  const calc = (d, weights) =>
    weights.reduce((sum, w, i) => sum + parseInt(d[i]) * w, 0)
  const mod = (n) => { const r = n % 11; return r < 2 ? 0 : 11 - r }
  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2]
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2]
  return mod(calc(digits, w1)) === parseInt(digits[12]) &&
         mod(calc(digits, w2)) === parseInt(digits[13])
}

function detectarChave(chave) {
  const v = chave.trim()
  if (!v) return null

  // Telefone: +55 + DDD (2 dígitos) + 8 ou 9 dígitos
  if (/^\+55\d{10,11}$/.test(v))
    return { tipo: 'Telefone', valido: true, chaveNormalizada: v }

  // CPF: 11 dígitos, com ou sem formatação
  const cpf = v.replace(/[.\-]/g, '')
  if (/^\d{11}$/.test(cpf))
    return { tipo: 'CPF', valido: validarCPF(cpf), chaveNormalizada: cpf }

  // CNPJ: 14 dígitos, com ou sem formatação
  const cnpj = v.replace(/[.\-\/]/g, '')
  if (/^\d{14}$/.test(cnpj))
    return { tipo: 'CNPJ', valido: validarCNPJ(cnpj), chaveNormalizada: cnpj }

  // E-mail
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
    return { tipo: 'E-mail', valido: true, chaveNormalizada: v }

  // Chave aleatória (UUID)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    return { tipo: 'Chave aleatória', valido: true, chaveNormalizada: v.toLowerCase() }

  return { tipo: null, valido: false, chaveNormalizada: v }
}

function ChaveStatus({ chave }) {
  if (!chave.trim()) return (
    <span className="input-hint">
      Telefone: +55DDD + número &nbsp;|&nbsp; CPF/CNPJ com ou sem formatação &nbsp;|&nbsp; E-mail &nbsp;|&nbsp; Chave aleatória (UUID)
    </span>
  )
  const d = detectarChave(chave)
  if (!d || !d.tipo) return <span className="chave-status invalido">Formato não reconhecido</span>
  if (!d.valido) return <span className="chave-status invalido">{d.tipo} com dígitos inválidos</span>
  return <span className="chave-status valido">{d.tipo} válido</span>
}

export default function Configuracoes() {
  const { toasts, show } = useToast()
  const [form, setForm] = useState({ chave: '', nome: '', cidade: '' })
  const [configurado, setConfigurado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [licenca, setLicenca] = useState(null)
  const [novaChaveLicenca, setNovaChaveLicenca] = useState('')
  const [erroLicenca, setErroLicenca] = useState(null)
  const [ativandoLicenca, setAtivandoLicenca] = useState(false)

  useEffect(() => {
    window.api['pix_obterConfig']().then((res) => {
      if (res.ok && res.data) {
        setForm({
          chave: res.data.chave,
          nome: res.data.nome,
          cidade: res.data.cidade,
        })
        setConfigurado(res.data.configurado)
      }
    })
    window.api['licenca_status']().then((res) => {
      if (res.ok) setLicenca(res.data?.licenca)
    })
  }, [])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function ativarLicenca(e) {
    e.preventDefault()
    if (novaChaveLicenca.length !== 19) {
      setErroLicenca('Informe a chave completa no formato XXXX-XXXX-XXXX-XXXX.')
      return
    }
    setAtivandoLicenca(true)
    setErroLicenca(null)
    try {
      const res = await window.api.licenca_ativar({ chave: novaChaveLicenca })
      if (res.ok) {
        const status = await window.api['licenca_status']()
        if (status.ok) setLicenca(status.data?.licenca)
        setNovaChaveLicenca('')
        show('Licença ativada com sucesso', 'sucesso')
      } else {
        setErroLicenca(MENSAGENS_ERRO_LICENCA[res.motivo] || 'Erro ao ativar a licença.')
      }
    } catch {
      setErroLicenca(MENSAGENS_ERRO_LICENCA.erro_rede)
    } finally {
      setAtivandoLicenca(false)
    }
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.chave.trim()) { show('Informe a chave PIX', 'erro'); return }
    const deteccao = detectarChave(form.chave)
    if (!deteccao || !deteccao.valido) { show('Chave PIX inválida — verifique o formato', 'erro'); return }
    if (!form.nome.trim()) { show('Informe o nome do estabelecimento', 'erro'); return }
    if (!form.cidade.trim()) { show('Informe a cidade', 'erro'); return }
    setSalvando(true)
    const res = await window.api['pix_salvarConfig']({
      chave: deteccao.chaveNormalizada,
      nome: form.nome.trim(),
      cidade: form.cidade.trim(),
    })
    setSalvando(false)
    if (res.ok) {
      setConfigurado(true)
      show('Configurações salvas com sucesso', 'sucesso')
    } else {
      show(res.error || 'Erro ao salvar', 'erro')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="btn btn-ghost btn-sm">← Voltar</Link>
        <h1>Configurações</h1>
      </div>

      <div className="card">
        <p className="section-title">Chave PIX</p>
        {configurado && (
          <p className="config-status">Chave configurada e criptografada no sistema.</p>
        )}
        <form onSubmit={salvar}>
          <div className="form-group">
            <label>Chave PIX *</label>
            <input
              type="text"
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              value={form.chave}
              onChange={(e) => set('chave', e.target.value)}
            />
            <ChaveStatus chave={form.chave} />
          </div>
          <div className="form-group">
            <label>Nome do estabelecimento *</label>
            <input
              type="text"
              placeholder="Ex: Barraca"
              maxLength={25}
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
            />
            <span className="input-hint">Aparece no comprovante do cliente (máx. 25 caracteres)</span>
          </div>
          <div className="form-group">
            <label>Cidade *</label>
            <input
              type="text"
              placeholder="Ex: Salvador"
              maxLength={15}
              value={form.cidade}
              onChange={(e) => set('cidade', e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <p className="section-title">Chave de Acesso</p>
        {licenca && (
          <p className="config-status">
            Licença ativa — chave:{' '}
            <strong>{licenca.chave}</strong>
          </p>
        )}
        <form onSubmit={ativarLicenca}>
          <div className="form-group">
            <label>Nova chave de licença</label>
            <input
              type="text"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={novaChaveLicenca}
              onChange={(e) => { setNovaChaveLicenca(formatarChave(e.target.value)); setErroLicenca(null) }}
              maxLength={19}
              autoComplete="off"
              spellCheck={false}
            />
            {erroLicenca && <span className="chave-status invalido">{erroLicenca}</span>}
          </div>
          <div className="form-actions">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={ativandoLicenca || novaChaveLicenca.length !== 19}
            >
              {ativandoLicenca ? 'Ativando…' : 'Ativar'}
            </button>
          </div>
        </form>
      </div>

      <Toast toasts={toasts} />
    </div>
  )
}
