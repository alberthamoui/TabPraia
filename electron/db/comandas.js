const db = require('./db')

function listarAbertas() {
  return db.prepare(
    "SELECT * FROM comandas WHERE status = 'aberta' ORDER BY criada_em DESC"
  ).all()
}

function listarFechadas() {
  return db.prepare(
    "SELECT * FROM comandas WHERE status = 'fechada' ORDER BY fechada_em DESC"
  ).all()
}

function buscarPorId(id) {
  return db.prepare('SELECT * FROM comandas WHERE id = ?').get(id)
}

function clienteTemAberta(nome_cliente) {
  return db.prepare(
    "SELECT id FROM comandas WHERE nome_cliente = ? AND status = 'aberta'"
  ).get(nome_cliente)
}

function criar({ nome_cliente, observacao }) {
  const stmt = db.prepare(
    'INSERT INTO comandas (nome_cliente, observacao) VALUES (?, ?)'
  )
  const result = stmt.run(nome_cliente, observacao || null)
  return db.prepare('SELECT * FROM comandas WHERE id = ?').get(result.lastInsertRowid)
}

function recalcularTotal(comanda_id) {
  const result = db.prepare(
    'SELECT COALESCE(SUM(subtotal), 0) as total FROM itens_comanda WHERE comanda_id = ?'
  ).get(comanda_id)
  db.prepare('UPDATE comandas SET total = ? WHERE id = ?').run(result.total, comanda_id)
}

function fechar({ id, forma_pagamento }) {
  db.prepare(
    "UPDATE comandas SET status = 'fechada', forma_pagamento = ?, fechada_em = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
  ).run(forma_pagamento, id)
  return db.prepare('SELECT * FROM comandas WHERE id = ?').get(id)
}

function indicadoresDia() {
  const hoje = new Date().toISOString().slice(0, 10)
  return db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'fechada' THEN total ELSE 0 END), 0) as total_vendido,
      COALESCE(SUM(CASE WHEN status = 'fechada' AND forma_pagamento = 'pix' THEN total ELSE 0 END), 0) as total_pix,
      COALESCE(SUM(CASE WHEN status = 'fechada' AND forma_pagamento = 'dinheiro' THEN total ELSE 0 END), 0) as total_dinheiro,
      COUNT(CASE WHEN status = 'fechada' THEN 1 END) as fechadas_hoje,
      COUNT(CASE WHEN status = 'aberta' THEN 1 END) as abertas_total
    FROM comandas
    WHERE DATE(criada_em) = ?
  `).get(hoje)
}

function indicadoresDashboard() {
  const hoje = new Date().toISOString().slice(0, 10)
  const abertas = db.prepare("SELECT COUNT(*) as c FROM comandas WHERE status = 'aberta'").get().c
  const financeiro = db.prepare(`
    SELECT
      COALESCE(SUM(total), 0) as total_vendido,
      COALESCE(SUM(CASE WHEN forma_pagamento = 'pix' THEN total ELSE 0 END), 0) as total_pix,
      COALESCE(SUM(CASE WHEN forma_pagamento = 'dinheiro' THEN total ELSE 0 END), 0) as total_dinheiro
    FROM comandas
    WHERE status = 'fechada' AND DATE(fechada_em) = ?
  `).get(hoje)
  return { abertas, ...financeiro }
}

function produtosMaisVendidosDia() {
  const hoje = new Date().toISOString().slice(0, 10)
  return db.prepare(`
    SELECT ic.nome_produto_snapshot as nome, SUM(ic.quantidade) as quantidade, SUM(ic.subtotal) as total
    FROM itens_comanda ic
    JOIN comandas c ON c.id = ic.comanda_id
    WHERE DATE(c.criada_em) = ?
    GROUP BY ic.nome_produto_snapshot
    ORDER BY quantidade DESC
    LIMIT 10
  `).all(hoje)
}

function deletar({ id }) {
  const comanda = db.prepare('SELECT * FROM comandas WHERE id = ?').get(id)
  if (!comanda) throw new Error('Comanda não encontrada')
  if (comanda.status !== 'fechada') throw new Error('Só é possível apagar comandas fechadas')
  db.transaction(() => {
    db.prepare('DELETE FROM itens_comanda WHERE comanda_id = ?').run(id)
    db.prepare('DELETE FROM comandas WHERE id = ?').run(id)
  })()
}

function limparHistorico() {
  const ids = db.prepare("SELECT id FROM comandas WHERE status = 'fechada'").all().map((r) => r.id)
  if (ids.length === 0) return { apagadas: 0 }
  db.transaction(() => {
    db.prepare(`DELETE FROM itens_comanda WHERE comanda_id IN (${ids.map(() => '?').join(',')})`)
      .run(...ids)
    db.prepare("DELETE FROM comandas WHERE status = 'fechada'").run()
  })()
  return { apagadas: ids.length }
}

module.exports = {
  listarAbertas,
  listarFechadas,
  buscarPorId,
  clienteTemAberta,
  criar,
  recalcularTotal,
  fechar,
  indicadoresDia,
  indicadoresDashboard,
  produtosMaisVendidosDia,
  deletar,
  limparHistorico,
}
