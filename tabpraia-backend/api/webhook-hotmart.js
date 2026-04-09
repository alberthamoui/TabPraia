const supabase = require('../lib/supabase')
const { gerarChave, comparacaoSegura } = require('../lib/licenca')

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

function responder(res, status, body) {
  res.writeHead(status, SECURITY_HEADERS)
  res.end(JSON.stringify(body))
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Identifica se o produto é uma assinatura mensal ou licença permanente.
 * Ajuste a lógica conforme os nomes dos seus produtos na Hotmart.
 */
function identificarTipo(payload) {
  const nome = (
    payload?.data?.product?.name ||
    payload?.data?.offer?.payment_mode ||
    ''
  ).toLowerCase()

  if (nome.includes('mensal') || nome.includes('assinatura') || nome.includes('subscription') || nome.includes('monthly')) {
    return 'mensal'
  }
  return 'permanente'
}

/**
 * Calcula expira_em para licenças mensais (30 dias a partir de agora).
 */
function calcularExpiracao(tipo) {
  if (tipo !== 'mensal') return null
  const expira = new Date()
  expira.setDate(expira.getDate() + 30)
  return expira.toISOString()
}

async function enviarEmailChave({ email, nome, chave, tipo }) {
  const tipoLabel = tipo === 'mensal' ? 'Mensal' : 'Permanente'
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h1 style="color: #1a6fc4;">🏖️ TabPraia — Licença Ativada</h1>
      <p>Olá, <strong>${escapeHtml(nome)}</strong>!</p>
      <p>Sua licença foi aprovada. Use a chave abaixo para ativar o aplicativo:</p>
      <div style="background: #f4f6f8; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
        <code style="font-size: 1.4rem; letter-spacing: 0.15em; font-weight: bold; color: #145499;">
          ${chave}
        </code>
      </div>
      <p style="font-size: 0.9rem; color: #555;">
        Plano: <strong>${tipoLabel}</strong><br/>
        Abra o TabPraia, clique em "Ativar Licença" e insira esta chave.
      </p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;"/>
      <p style="font-size: 0.8rem; color: #888;">
        Se você não realizou esta compra, ignore este e-mail.
      </p>
    </div>
  `

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'TabPraia <noreply@tabpraia.app>',
      to: email,
      subject: `Sua chave de licença TabPraia — ${tipoLabel}`,
      html,
    }),
  })

  if (!emailRes.ok) {
    const err = await emailRes.text().catch(() => emailRes.status)
    throw new Error(`Falha ao enviar e-mail via Resend: ${err}`)
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return responder(res, 405, { ok: false, motivo: 'method_not_allowed' })
  }

  // Hotmart envia o token secreto no header X-Hotmart-Webhook-Token
  // Configure este valor no painel da Hotmart em Ferramentas > Webhooks
  const webhookToken = req.headers['x-hotmart-webhook-token'] || ''
  if (!comparacaoSegura(webhookToken, process.env.HOTMART_WEBHOOK_SECRET || '')) {
    return responder(res, 401, { ok: false, motivo: 'unauthorized' })
  }

  const payload = req.body
  const evento = payload?.event

  // Só processa compras aprovadas
  if (evento !== 'PURCHASE_APPROVED') {
    return responder(res, 200, { ok: true, ignorado: true, evento })
  }

  const nomeCliente = payload?.data?.buyer?.name || 'Cliente'
  const emailCliente = payload?.data?.buyer?.email

  if (!emailCliente) {
    return responder(res, 400, { ok: false, motivo: 'email_ausente' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailCliente)) {
    return responder(res, 400, { ok: false, motivo: 'email_invalido' })
  }

  let tipo = identificarTipo(payload)
  if (!['permanente', 'mensal'].includes(tipo)) tipo = 'permanente'
  const expira_em = calcularExpiracao(tipo)
  const chave = gerarChave()

  const { error: insertError } = await supabase.from('licencas').insert({
    chave,
    tipo,
    status: 'ativa',
    expira_em,
    cliente_nome: nomeCliente,
    cliente_email: emailCliente,
  })

  if (insertError) {
    console.error('Erro ao inserir licença:', insertError)
    return responder(res, 500, { ok: false, motivo: 'erro_interno' })
  }

  try {
    await enviarEmailChave({ email: emailCliente, nome: nomeCliente, chave, tipo })
  } catch (emailErr) {
    // E-mail falhou mas a licença já foi criada — loga e retorna sucesso parcial
    console.error('Falha no envio de e-mail:', emailErr.message)
    return responder(res, 200, { ok: true, aviso: 'licenca_criada_email_falhou' })
  }

  return responder(res, 200, { ok: true })
}
