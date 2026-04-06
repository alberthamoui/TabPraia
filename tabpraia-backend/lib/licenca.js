const crypto = require('crypto')

/**
 * Gera uma chave de licença no formato XXXX-XXXX-XXXX-XXXX (hex uppercase).
 */
function gerarChave() {
  const hex = crypto.randomBytes(8).toString('hex').toUpperCase()
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`
}

/**
 * Compara duas strings em tempo constante para evitar timing attacks.
 */
function comparacaoSegura(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) {
    // Ainda executamos a comparação para não vazar o tamanho
    crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1))
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

module.exports = { gerarChave, comparacaoSegura }
