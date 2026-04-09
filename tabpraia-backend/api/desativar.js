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

  if (!comparacaoSegura(req.headers['x-app-secret'] || '', process.env.APP_SECRET || '')) {
    return responder(res, 401, { ok: false, motivo: 'unauthorized' })
  }

  const { chave, hardware_id } = req.body || {}

  if (!chave || typeof chave !== 'string') {
    return responder(res, 400, { ok: false, motivo: 'chave_invalida' })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || null

  const { data: licenca, error } = await supabase
    .from('licencas')
    .select('id, hardware_id, status')
    .eq('chave', chave)
    .single()

  if (error || !licenca) {
    return responder(res, 200, { ok: false, motivo: 'chave_invalida' })
  }

  // Só permite desativar se o hardware_id bater (evita que outro PC desative a licença de alguém)
  if (licenca.hardware_id && !comparacaoSegura(licenca.hardware_id, hardware_id)) {
    registrarAuditoria(licenca.id, hardware_id, 'desativacao_hardware_mismatch', ip).catch(() => {})
    return responder(res, 200, { ok: false, motivo: 'hardware_mismatch' })
  }

  await supabase
    .from('licencas')
    .update({ hardware_id: null, ativada_em: null })
    .eq('id', licenca.id)

  registrarAuditoria(licenca.id, hardware_id, 'desativacao_ok', ip).catch(() => {})

  return responder(res, 200, { ok: true })
}
