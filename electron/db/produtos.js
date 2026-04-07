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
  const emUso = db.prepare('SELECT COUNT(*) as c FROM itens_comanda WHERE produto_id = ?').get(id).c
  if (emUso > 0) throw new Error('Produto está em uso em comandas e não pode ser apagado. Inative-o em vez disso.')
  db.prepare('DELETE FROM produtos WHERE id = ?').run(id)
  return { apagado: true }
}

module.exports = { listar, listarAtivos, criar, editar, toggleAtivo, apagar }
