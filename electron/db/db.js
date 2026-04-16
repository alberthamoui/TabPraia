const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

const dbPath = app.isPackaged
  ? path.join(process.resourcesPath, 'praieiro.db')
  : path.join(__dirname, '../../praieiro.db')

const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      categoria TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS comandas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_cliente TEXT NOT NULL,
      observacao TEXT,
      status TEXT NOT NULL DEFAULT 'aberta',
      total REAL NOT NULL DEFAULT 0,
      forma_pagamento TEXT,
      criada_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      fechada_em TEXT
    );

    CREATE TABLE IF NOT EXISTS itens_comanda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comanda_id INTEGER NOT NULL REFERENCES comandas(id),
      produto_id INTEGER REFERENCES produtos(id),
      nome_produto_snapshot TEXT NOT NULL,
      preco_unitario_snapshot REAL NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 1,
      subtotal REAL NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `)
}

function runMigrationProdutoIdNullable() {
  const col = db.prepare("SELECT * FROM pragma_table_info('itens_comanda') WHERE name = 'produto_id'").get()
  if (!col || col.notnull === 0) return // já está nullable, nada a fazer

  // SQLite exige foreign_keys = OFF fora de qualquer transação para reconstruir tabelas
  db.pragma('foreign_keys = OFF')
  try {
    db.exec(`
      BEGIN;
      CREATE TABLE itens_comanda_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comanda_id INTEGER NOT NULL REFERENCES comandas(id),
        produto_id INTEGER REFERENCES produtos(id),
        nome_produto_snapshot TEXT NOT NULL,
        preco_unitario_snapshot REAL NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 1,
        subtotal REAL NOT NULL,
        criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      INSERT INTO itens_comanda_new SELECT * FROM itens_comanda;
      DROP TABLE itens_comanda;
      ALTER TABLE itens_comanda_new RENAME TO itens_comanda;
      COMMIT;
    `)
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

function runSeed() {
  const count = db.prepare('SELECT COUNT(*) as c FROM produtos').get().c
  if (count > 0) return

  const insert = db.prepare(
    'INSERT INTO produtos (nome, preco) VALUES (?, ?)'
  )
  const seedData = [
    ['Coca-Cola', 6.0],
    ['Guaraná', 5.0],
    ['Água de coco', 8.0],
    ['Milho verde', 7.0],
    ['Sanduíche', 12.0],
  ]
  const insertMany = db.transaction((items) => {
    for (const [nome, preco] of items) insert.run(nome, preco)
  })
  insertMany(seedData)
}

runMigrations()
runMigrationProdutoIdNullable()
runSeed()

module.exports = db
