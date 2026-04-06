import { useState } from 'react'

const MENSAGENS_ERRO = {
  chave_invalida: 'Chave de licença inválida ou não encontrada.',
  revogada: 'Esta licença foi revogada. Entre em contato com o suporte.',
  hardware_mismatch: 'Esta chave já está ativada em outro computador.',
  expirada: 'Sua licença expirou. Renove sua assinatura para continuar.',
  erro_rede: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
}

function formatarChave(valor) {
  // Remove tudo que não seja hex, converte para maiúsculo, divide em grupos de 4
  const hex = valor.replace(/[^A-Fa-f0-9]/g, '').toUpperCase().slice(0, 16)
  const partes = hex.match(/.{1,4}/g) || []
  return partes.join('-')
}

export default function Ativacao({ onAtivado }) {
  const [chave, setChave] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  function handleChaveChange(e) {
    setChave(formatarChave(e.target.value))
    setErro(null)
  }

  async function ativar(e) {
    e.preventDefault()
    if (chave.length !== 19) {
      setErro('Informe a chave completa no formato XXXX-XXXX-XXXX-XXXX.')
      return
    }
    setCarregando(true)
    setErro(null)
    try {
      const res = await window.api.licenca_ativar({ chave })
      if (res.ok) {
        onAtivado()
      } else {
        setErro(MENSAGENS_ERRO[res.motivo] || 'Erro ao ativar a licença. Tente novamente.')
      }
    } catch {
      setErro(MENSAGENS_ERRO.erro_rede)
    } finally {
      setCarregando(false)
    }
  }

  const chaveCompleta = chave.length === 19

  return (
    <div className="ativacao-page">
      <div className="ativacao-card">
        <div className="ativacao-logo">🏖️</div>
        <h1 className="ativacao-titulo">Barraca</h1>
        <p className="ativacao-sub">Insira sua chave para ativar o aplicativo</p>

        <form onSubmit={ativar}>
          <div className="form-group">
            <label htmlFor="chave-licenca">Chave de licença</label>
            <input
              id="chave-licenca"
              type="text"
              className="ativacao-input"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={chave}
              onChange={handleChaveChange}
              maxLength={19}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {erro && <div className="ativacao-erro">{erro}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-lg ativacao-btn"
            disabled={carregando || !chaveCompleta}
          >
            {carregando ? 'Ativando…' : 'Ativar Licença'}
          </button>
        </form>

        <p className="ativacao-hint">
          Não tem uma chave? Adquira o TabPraia em <strong>tabpraia.app</strong>
        </p>
      </div>
    </div>
  )
}
