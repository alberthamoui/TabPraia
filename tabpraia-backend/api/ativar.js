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
  res.status(status).set(SECURITY_HEADERS).json(body)
}

module.exports = async function handler(req, res) {
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
  if (!hardware_id || typeof hardware_id !== 'string' || hardware_id.length !== 64) {
    return responder(res, 400, { ok: false, motivo: 'hardware_id_invalido' })
  }

  const { data: licenca, error } = await supabase
    .from('licencas')
    .select('*')
    .eq('chave', chave)
    .single()

  if (error || !licenca) {
    return responder(res, 200, { ok: false, motivo: 'chave_invalida' })
  }

  if (licenca.status === 'revogada') {
    return responder(res, 200, { ok: false, motivo: 'revogada' })
  }

  if (licenca.status !== 'ativa') {
    return responder(res, 200, { ok: false, motivo: 'chave_invalida' })
  }

  if (licenca.hardware_id && !comparacaoSegura(licenca.hardware_id, hardware_id)) {
    return responder(res, 200, { ok: false, motivo: 'hardware_mismatch' })
  }

  if (licenca.tipo === 'mensal' && licenca.expira_em && new Date(licenca.expira_em) < new Date()) {
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

  return responder(res, 200, {
    ok: true,
    tipo: licenca.tipo,
    expira_em: licenca.expira_em,
    cliente_nome: licenca.cliente_nome,
  })
}
