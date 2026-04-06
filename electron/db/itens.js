const db = require('./db')
const { recalcularTotal } = require('./comandas')

function listarPorComanda(comanda_id) {
  return db.prepare(
    'SELECT * FROM itens_comanda WHERE comanda_id = ? ORDER BY criado_em'
  ).all(comanda_id)
}

function adicionar({ comanda_id, produto_id }) {
  const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto_id)
  if (!produto) throw new Error('Produto não encontrado')

  const existente = db.prepare(
    'SELECT * FROM itens_comanda WHERE comanda_id = ? AND produto_id = ?'
  ).get(comanda_id, produto_id)

  if (existente) {
    const novaQtd = existente.quantidade + 1
    db.prepare(
      'UPDATE itens_comanda SET quantidade = ?, subtotal = ? WHERE id = ?'
    ).run(novaQtd, novaQtd * existente.preco_unitario_snapshot, existente.id)
  } else {
    db.prepare(
      'INSERT INTO itens_comanda (comanda_id, produto_id, nome_produto_snapshot, preco_unitario_snapshot, quantidade, subtotal) VALUES (?, ?, ?, ?, 1, ?)'
    ).run(comanda_id, produto_id, produto.nome, produto.preco, produto.preco)
  }

  recalcularTotal(comanda_id)
  return listarPorComanda(comanda_id)
}

function atualizarQuantidade({ id, quantidade, comanda_id }) {
  if (quantidade < 1) throw new Error('Quantidade mínima é 1')
  const item = db.prepare('SELECT * FROM itens_comanda WHERE id = ?').get(id)
  if (!item) throw new Error('Item não encontrado')
  db.prepare(
    'UPDATE itens_comanda SET quantidade = ?, subtotal = ? WHERE id = ?'
  ).run(quantidade, quantidade * item.preco_unitario_snapshot, id)
  recalcularTotal(comanda_id)
  return listarPorComanda(comanda_id)
}

function remover({ id, comanda_id }) {
  db.prepare('DELETE FROM itens_comanda WHERE id = ?').run(id)
  recalcularTotal(comanda_id)
  return listarPorComanda(comanda_id)
}

module.exports = { listarPorComanda, adicionar, atualizarQuantidade, remover }
