const supabase = require('../lib/supabase')
const { comparacaoSegura } = require('../lib/licenca')

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

function responder(res, status, body) {
  const headers = { ...SECURITY_HEADERS }
  if (process.env.ALLOWED_ORIGIN) headers['Access-Control-Allow-Origin'] = process.env.ALLOWED_ORIGIN
  res.writeHead(status, headers)
  res.end(JSON.stringify(body))
}

async function registrarAuditoria(licenca_id, hardware_id, resultado, ip) {
  await supabase.from('validacoes').insert({ licenca_id, hardware_id, resultado, ip })
}

async function verificarRateLimit(hardware_id) {
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('validacoes')
    .select('*', { count: 'exact', head: true })
    .eq('hardware_id', hardware_id)
    .gte('created_at', umaHoraAtras)
  if (error) return false
  return count >= 30
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    const corsHeaders = {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-App-Secret',
      'Access-Control-Max-Age': '86400',
    }
    if (process.env.ALLOWED_ORIGIN) corsHeaders['Access-Control-Allow-Origin'] = process.env.ALLOWED_ORIGIN
    res.writeHead(204, corsHeaders)
    return res.end()
  }

  if (req.method !== 'POST') {
    return responder(res, 405, { ok: false, motivo: 'method_not_allowed' })
  }

  // Valida segredo compartilhado com o Electron
  if (!comparacaoSegura(req.headers['x-app-secret'] || '', process.env.APP_SECRET || '')) {
    return responder(res, 401, { ok: false, motivo: 'unauthorized' })
  }

  const { chave, hardware_id } = req.body || {}

  if (!chave || typeof chave !== 'string' || !/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(chave)) {
    return responder(res, 400, { ok: false, motivo: 'chave_invalida' })
  }
  if (!hardware_id || typeof hardware_id !== 'string' || !/^[a-f0-9]{64}$/i.test(hardware_id)) {
    return responder(res, 400, { ok: false, motivo: 'hardware_id_invalido' })
  }

  const limitExcedido = await verificarRateLimit(hardware_id)
  if (limitExcedido) {
    return responder(res, 429, { ok: false, motivo: 'rate_limited' })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || null

  const { data: licenca, error } = await supabase
    .from('licencas')
    .select('*')
    .eq('chave', chave)
    .single()

  if (error || !licenca) {
    return responder(res, 200, { ok: false, motivo: 'chave_invalida' })
  }

  if (licenca.status === 'revogada') {
    registrarAuditoria(licenca.id, hardware_id, 'ativacao_revogada', ip).catch(() => {})
    return responder(res, 200, { ok: false, motivo: 'revogada' })
  }

  if (licenca.status !== 'ativa') {
    registrarAuditoria(licenca.id, hardware_id, 'ativacao_invalida', ip).catch(() => {})
    return responder(res, 200, { ok: false, motivo: 'chave_invalida' })
  }

  if (licenca.hardware_id && !comparacaoSegura(licenca.hardware_id, hardware_id)) {
    registrarAuditoria(licenca.id, hardware_id, 'ativacao_hardware_mismatch', ip).catch(() => {})
    return responder(res, 200, { ok: false, motivo: 'hardware_mismatch' })
  }

  if (licenca.tipo === 'mensal' && licenca.expira_em && new Date(licenca.expira_em) < new Date()) {
    registrarAuditoria(licenca.id, hardware_id, 'ativacao_expirada', ip).catch(() => {})
    return responder(res, 200, { ok: false, motivo: 'expirada' })
  }

  // Primeira ativação: vincula hardware_id e registra data
  if (!licenca.hardware_id) {
    const { error: updateError } = await supabase
      .from('licencas')
      .update({ hardware_id, ativada_em: new Date().toISOString() })
      .eq('id', licenca.id)

    if (updateError) {
      return responder(res, 500, { ok: false, motivo: 'erro_interno' })
    }
  }

  registrarAuditoria(licenca.id, hardware_id, 'ativacao_ok', ip).catch(() => {})

  return responder(res, 200, {
    ok: true,
    tipo: licenca.tipo,
    expira_em: licenca.expira_em,
    cliente_nome: licenca.cliente_nome,
  })
}
