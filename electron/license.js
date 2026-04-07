const { app } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const os = require('os')
const { execSync } = require('child_process')

const VALIDATION_INTERVAL_DAYS = 30
const GRACE_PERIOD_DAYS = 7

// ─── Helpers de caminho ─────────────────────────────────────────────────────

function getLicensePath() {
  return path.join(app.getPath('userData'), 'license.json')
}

function getEnv() {
  try { return require('./env') } catch { return {} }
}

function getApiUrl() {
  return getEnv().API_URL || process.env.VITE_API_URL || 'http://localhost:3000'
}

function getAppSecret() {
  return getEnv().APP_SECRET || process.env.VITE_APP_SECRET || ''
}

// ─── Hardware ID ─────────────────────────────────────────────────────────────

/**
 * Retorna um hash SHA-256 do identificador único da máquina.
 * No Windows lê o MachineGuid do registro; fallback para hostname+plataforma.
 */
function getHardwareId() {
  let raw = ''

  try {
    if (process.platform === 'win32') {
      const output = execSync(
        'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
        { encoding: 'utf8', timeout: 5000, windowsHide: true }
      )
      const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/)
      if (match) raw = match[1].trim()
    }
  } catch {}

  if (!raw) {
    raw = os.hostname() + process.platform + process.arch
  }

  return crypto.createHash('sha256').update(raw).digest('hex')
}

// ─── Leitura / escrita de license.json ──────────────────────────────────────

function lerLicenca() {
  try {
    return JSON.parse(fs.readFileSync(getLicensePath(), 'utf8'))
  } catch {
    return null
  }
}

function salvarLicenca(data) {
  fs.writeFileSync(getLicensePath(), JSON.stringify(data, null, 2), 'utf8')
}

function deletarLicenca() {
  try { fs.unlinkSync(getLicensePath()) } catch {}
}

// ─── Lógica de validade ──────────────────────────────────────────────────────

/**
 * Retorna true se a licença ainda está dentro da janela de validação local
 * (os 30 dias após a última revalidação bem-sucedida).
 */
function licencaValida(licenca) {
  if (!licenca?.validada_localmente_ate) return false
  return new Date(licenca.validada_localmente_ate) > new Date()
}

/**
 * Retorna true se ainda estamos dentro do grace period de 7 dias após o
 * vencimento da janela de 30 dias (total: 37 dias sem acesso à rede).
 */
function emGracePeriod(licenca) {
  if (!licenca?.ultima_validacao) return false
  const deadline = new Date(licenca.ultima_validacao)
  deadline.setDate(deadline.getDate() + VALIDATION_INTERVAL_DAYS + GRACE_PERIOD_DAYS)
  return deadline > new Date()
}

// ─── Comunicação com a API ───────────────────────────────────────────────────

async function chamarApi(endpoint, body) {
  const res = await fetch(`${getApiUrl()}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Secret': getAppSecret(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  return res.json()
}

/**
 * Monta o objeto license.json a ser salvo após uma validação bem-sucedida.
 */
function construirLicencaLocal(dadosApi, chave) {
  const agora = new Date()
  const validadaAte = new Date(agora.getTime() + VALIDATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
  return {
    chave,
    tipo: dadosApi.tipo,
    expira_em: dadosApi.expira_em || null,
    ultima_validacao: agora.toISOString(),
    validada_localmente_ate: validadaAte.toISOString(),
  }
}

// ─── Operações públicas ──────────────────────────────────────────────────────

/**
 * Chama /api/ativar, salva license.json em caso de sucesso.
 * Retorna o resultado da API ({ ok, tipo, expira_em, ... } ou { ok: false, motivo }).
 */
async function ativar({ chave }) {
  const hardware_id = getHardwareId()
  const resultado = await chamarApi('/api/ativar', { chave, hardware_id })
  if (resultado.ok) {
    salvarLicenca(construirLicencaLocal(resultado, chave))
  }
  return resultado
}

/**
 * Chama /api/validar (sem efeitos colaterais no servidor).
 * Atualiza license.json localmente em caso de sucesso.
 * Retorna o resultado da API.
 */
async function validarOnline(chave) {
  const hardware_id = getHardwareId()
  const resultado = await chamarApi('/api/validar', { chave, hardware_id })
  if (resultado.ok) {
    const licencaAtual = lerLicenca()
    salvarLicenca(construirLicencaLocal(resultado, chave || licencaAtual?.chave))
  }
  return resultado
}

module.exports = {
  getHardwareId,
  lerLicenca,
  salvarLicenca,
  deletarLicenca,
  licencaValida,
  emGracePeriod,
  ativar,
  validarOnline,
  construirLicencaLocal,
  VALIDATION_INTERVAL_DAYS,
  GRACE_PERIOD_DAYS,
}
