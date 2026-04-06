const { safeStorage, app } = require('electron')
const path = require('path')
const fs = require('fs')
const QRCode = require('qrcode')

const configPath = path.join(app.getPath('userData'), 'pix-config.json')

function lerConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch {
    return {}
  }
}

function salvarConfig(data) {
  fs.writeFileSync(configPath, JSON.stringify(data), 'utf8')
}

function salvarChaveConfig({ chave, nome, cidade }) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Criptografia não disponível neste sistema')
  }
  const config = lerConfig()
  if (chave !== undefined && chave !== '') {
    config.chaveEncriptada = safeStorage.encryptString(chave).toString('hex')
  }
  if (nome !== undefined) config.nome = nome
  if (cidade !== undefined) config.cidade = cidade
  salvarConfig(config)
}

function obterChaveConfig() {
  const config = lerConfig()
  let chave = ''
  if (config.chaveEncriptada) {
    const buf = Buffer.from(config.chaveEncriptada, 'hex')
    chave = safeStorage.decryptString(buf)
  }
  return {
    chave,
    nome: config.nome || '',
    cidade: config.cidade || '',
    configurado: !!config.chaveEncriptada,
  }
}

// --- EMV payload (padrão Banco Central - PIX Estático) ---

function emv(id, value) {
  const v = String(value);
  return id + String(v.length).padStart(2, '0') + v;
}

function crc16(str) {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc
}

function normalizar(s, max) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase()
    .substring(0, max);
}

function buildPixPayload(chave, valor, nome, cidade) {
  // MAI (Merchant Account Information) — ID 26
  const gui = emv('00', 'BR.GOV.BCB.PIX') + emv('01', chave);
  const mai = emv('26', gui);

  // Additional Data Field — ID 62
  const adField = emv('62', emv('05', '***'));

  // Monta payload sem CRC
  let partial =
    emv('00', '01') +                                          // Payload Format Indicator
    mai +                                                       // Merchant Account Info
    emv('52', '0000') +                                        // MCC (não informado)
    emv('53', '986');                                           // Moeda (BRL = 986)

  // Campo 54 só incluso se valor > 0
  const numValor = parseFloat(valor);
  if (numValor > 0) {
    partial += emv('54', numValor.toFixed(2));                 // Transaction Amount
  }

  partial +=
    emv('58', 'BR') +                                          // Country Code
    emv('59', normalizar(nome || 'ESTABELECIMENTO', 25)) +     // Merchant Name
    emv('60', normalizar(cidade || 'BRASIL', 15)) +            // Merchant City
    adField +                                                   // Additional Data
    '6304';                                                     // CRC placeholder (ID + Length)

  const crc = crc16(partial).toString(16).toUpperCase().padStart(4, '0');
  return partial + crc;
}

async function gerarQR({ valor }) {
  const { chave, nome, cidade, configurado } = obterChaveConfig()
  if (!configurado) throw new Error('Chave PIX não configurada. Acesse Configurações.')

  const payload = buildPixPayload(chave, valor, nome, cidade)
  const dataUrl = await QRCode.toDataURL(payload, { width: 280, margin: 2, errorCorrectionLevel: 'M' })
  return { dataUrl, payload }
}

module.exports = { salvarChaveConfig, obterChaveConfig, gerarQR }
