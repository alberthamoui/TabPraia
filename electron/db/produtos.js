const db = require('./db')

function listar() {
  return db.prepare('SELECT * FROM produtos ORDER BY nome').all()
}

function listarAtivos() {
  return db.prepare('SELECT * FROM produtos WHERE ativo = 1 ORDER BY nome').all()
}

function criar({ nome, preco, categoria }) {
  const stmt = db.prepare(
    'INSERT INTO produtos (nome, preco, categoria) VALUES (?, ?, ?)'
  )
  const result = stmt.run(nome, preco, categoria || null)
  return db.prepare('SELECT * FROM produtos WHERE id = ?').get(result.lastInsertRowid)
}

function editar({ id, nome, preco, categoria }) {
  db.prepare(
    'UPDATE produtos SET nome = ?, preco = ?, categoria = ? WHERE id = ?'
  ).run(nome, preco, categoria || null, id)
  return db.prepare('SELECT * FROM produtos WHERE id = ?').get(id)
}

function toggleAtivo({ id }) {
  db.prepare('UPDATE produtos SET ativo = 1 - ativo WHERE id = ?').run(id)
  return db.prepare('SELECT * FROM produtos WHERE id = ?').get(id)
}

function apagar({ id }) {
  const emAberta = db.prepare(`
    SELECT COUNT(*) as c FROM itens_comanda ic
    JOIN comandas c ON c.id = ic.comanda_id
    WHERE ic.produto_id = ? AND c.status = 'aberta'
  `).get(id).c
  if (emAberta > 0) throw new Error('Produto está em uma comanda aberta. Feche-a antes de apagar')

  db.transaction(() => {
    // Desvincula o produto dos itens de comandas fechadas (snapshot preserva o histórico)
    db.prepare(`
      UPDATE itens_comanda SET produto_id = NULL
      WHERE produto_id = ?
    `).run(id)
    db.prepare('DELETE FROM produtos WHERE id = ?').run(id)
  })()

  return { apagado: true }
}

module.exports = { listar, listarAtivos, criar, editar, toggleAtivo, apagar }
