const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

if (require('electron-squirrel-startup')) app.quit()

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Barraca do João',
    autoHideMenuBar: true,
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  // Inicializa o banco antes de registrar os handlers
  require('./db/db')
  registerHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function registerHandlers() {
  const produtos = require('./db/produtos')
  const comandas = require('./db/comandas')
  const itens = require('./db/itens')
  const pix = require('./pix')

  function handle(channel, fn) {
    ipcMain.handle(channel, async (_event, args) => {
      try {
        return { ok: true, data: fn(args) }
      } catch (err) {
        return { ok: false, error: err.message }
      }
    })
  }

  // Produtos
  handle('produtos:listar', () => produtos.listar())
  handle('produtos:listarAtivos', () => produtos.listarAtivos())
  handle('produtos:criar', (args) => produtos.criar(args))
  handle('produtos:editar', (args) => produtos.editar(args))
  handle('produtos:toggleAtivo', (args) => produtos.toggleAtivo(args))

  // Comandas
  handle('comandas:listarAbertas', () => comandas.listarAbertas())
  handle('comandas:listarFechadas', () => comandas.listarFechadas())
  handle('comandas:buscarPorId', (args) => comandas.buscarPorId(args.id))
  handle('comandas:clienteTemAberta', (args) => comandas.clienteTemAberta(args.nome_cliente))
  handle('comandas:criar', (args) => comandas.criar(args))
  handle('comandas:fechar', (args) => comandas.fechar(args))
  handle('comandas:indicadoresDia', () => comandas.indicadoresDia())
  handle('comandas:indicadoresDashboard', () => comandas.indicadoresDashboard())
  handle('comandas:produtosMaisVendidosDia', () => comandas.produtosMaisVendidosDia())
  handle('comandas:deletar', (args) => comandas.deletar(args))

  // Itens
  handle('itens:listarPorComanda', (args) => itens.listarPorComanda(args.comanda_id))
  handle('itens:adicionar', (args) => itens.adicionar(args))
  handle('itens:atualizarQuantidade', (args) => itens.atualizarQuantidade(args))
  handle('itens:remover', (args) => itens.remover(args))

  // PIX
  handle('pix:salvarConfig', (args) => pix.salvarChaveConfig(args))
  handle('pix:obterConfig', () => pix.obterChaveConfig())
  ipcMain.handle('pix:gerarQR', async (_event, args) => {
    try {
      return { ok: true, data: await pix.gerarQR(args) }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })
}
