# Barraca — Controle de Comandas

App desktop para Windows de controle de comandas de barraca de praia. Funciona 100% offline com banco SQLite local.

---

## Pré-requisitos

- [Node.js 18+](https://nodejs.org/)
- npm (incluso no Node.js)

---

## Instalação e execução em desenvolvimento

```bash
# 1. Instalar dependências
npm install

# 2. Rebuild do better-sqlite3 para Electron
npx electron-rebuild -f -w better-sqlite3

# 3. Rodar em modo dev (abre Vite + Electron juntos)
npm run dev
```

> O banco `praieiro.db` é criado automaticamente na raiz do projeto na primeira execução.

---

## Gerar executável para Windows

```bash
# Build do frontend + empacotamento Electron
npm run dist
```

O instalador `.exe` (NSIS) será gerado na pasta `release/`.

---

## Estrutura das tabelas

### `produtos`
| Campo | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | autoincrement |
| nome | TEXT | nome do produto |
| preco | REAL | preço unitário |
| categoria | TEXT | opcional |
| ativo | INTEGER | 0 ou 1 (default 1) |
| criado_em | TEXT | ISO 8601 |

### `comandas`
| Campo | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | autoincrement |
| nome_cliente | TEXT | nome do cliente |
| observacao | TEXT | ex: guarda-sol 8 |
| status | TEXT | "aberta" ou "fechada" |
| total | REAL | recalculado automaticamente |
| forma_pagamento | TEXT | null, "pix" ou "dinheiro" |
| criada_em | TEXT | ISO 8601 |
| fechada_em | TEXT | null enquanto aberta |

### `itens_comanda`
| Campo | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | autoincrement |
| comanda_id | INTEGER | FK → comandas.id |
| produto_id | INTEGER | FK → produtos.id |
| nome_produto_snapshot | TEXT | nome no momento do lançamento |
| preco_unitario_snapshot | REAL | preço no momento do lançamento |
| quantidade | INTEGER | mínimo 1 |
| subtotal | REAL | preco_unitario_snapshot × quantidade |
| criado_em | TEXT | ISO 8601 |

---

## Arquitetura

```
electron/
  main.js        → main process: cria janela, registra IPC handlers
  preload.js     → context bridge: expõe window.api ao renderer
  db/
    db.js        → conexão SQLite, migrations, seed
    produtos.js  → acesso a dados: produtos
    comandas.js  → acesso a dados: comandas + indicadores
    itens.js     → acesso a dados: itens_comanda

src/
  App.jsx        → roteamento com react-router (HashRouter)
  pages/         → uma página por tela do app
  components/    → Toast, Modal
  hooks/         → useToast
```

**Fluxo de dados:** `Renderer (React)` → `window.api.canal(args)` → `ipcRenderer.invoke` → `ipcMain.handle` → SQLite → resposta `{ ok, data }` ou `{ ok: false, error }`.

---

## Telas implementadas

| Tela | Rota |
|---|---|
| Dashboard | `/` |
| Nova Comanda | `/nova-comanda` |
| Tela da Comanda | `/comanda/:id` |
| Comandas em Aberto | `/comandas-abertas` |
| Fechamento | `/fechamento/:id` |
| Histórico | `/historico` |
| Resumo do Dia | `/resumo-dia` |
| Produtos | `/produtos` |

---

## Melhorias futuras sugeridas

- Impressão de recibo (PDF ou térmica via `electron-pos-printer`)
- Busca/filtro no histórico por data ou cliente
- Exportação diária para Excel ou CSV
- Backup automático do banco
- Múltiplos usuários / turnos
- Controle de estoque básico
- Modo escuro
