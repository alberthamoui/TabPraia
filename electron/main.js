const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { configurarUpdater } = require('./updater')
const path = require('path')
const fs = require('fs')

if (require('electron-squirrel-startup')) app.quit()

const isDev = !app.isPackaged

// ─── Carrega variáveis do .env em desenvolvimento ───────────────────────────
if (isDev) {
  try {
    const envPath = path.join(__dirname, '../.env')
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
      if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {}
}

// ─── Estado global de ativação ───────────────────────────────────────────────
const appState = { ativo: false, licenca: null }

// ─── Janela principal ────────────────────────────────────────────────────────
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
    title: 'TabPraia',
    autoHideMenuBar: true,
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ─── Verificação de licença na inicialização ─────────────────────────────────
async function verificarLicenca() {
  const licenca = require('./license')
  const dados = licenca.lerLicenca()

  if (!dados) {
    appState.ativo = false
    return
  }

  // Sempre tenta validar online primeiro — permite revogação imediata.
  // Só usa o cache local se não houver conexão com o servidor.
  try {
    const resultado = await licenca.validarOnline(dados.chave)
    if (resultado.ok) {
      appState.ativo = true
      appState.licenca = licenca.lerLicenca() // já atualizado por validarOnline
    } else {
      // Licença revogada, expirada ou inválida no servidor
      licenca.deletarLicenca()
      appState.ativo = false
    }
  } catch {
    // Falha de rede — usa cache local dentro do grace period
    const mensalExpirado =
      dados.tipo === 'mensal' &&
      dados.expira_em &&
      new Date(dados.expira_em) <= new Date()

    if (!mensalExpirado && (licenca.licencaValida(dados) || licenca.emGracePeriod(dados))) {
      appState.ativo = true
      appState.licenca = dados
    } else {
      appState.ativo = false
    }
  }
}

// ─── Inicialização ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  require('./db/db')
  await verificarLicenca()
  registerHandlers()
  createWindow()
  configurarUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────
function registerHandlers() {
  const produtos = require('./db/produtos')
  const comandas = require('./db/comandas')
  const itens = require('./db/itens')
  const pix = require('./pix')
  const licenca = require('./license')

  // Wrapper para handlers síncronos
  function handle(channel, fn) {
    ipcMain.handle(channel, async (_event, args) => {
      try {
        return { ok: true, data: fn(args) }
      } catch (err) {
        return { ok: false, error: err.message }
      }
    })
  }

  // ── Licença ──────────────────────────────────────────────────────────────
  ipcMain.handle('licenca:status', () => ({
    ok: true,
    data: { ativo: appState.ativo, licenca: appState.licenca },
  }))

  ipcMain.handle('licenca:ativar', async (_event, args) => {
    try {
      const resultado = await licenca.ativar(args)
      if (resultado.ok) {
        appState.ativo = true
        appState.licenca = licenca.lerLicenca()
      }
      return resultado
    } catch (err) {
      return { ok: false, motivo: 'erro_rede', mensagem: err.message }
    }
  })

  ipcMain.handle('licenca:validar', async () => {
    try {
      const dados = licenca.lerLicenca()
      if (!dados) return { ok: false, motivo: 'sem_licenca' }
      const resultado = await licenca.validarOnline(dados.chave)
      if (resultado.ok) {
        appState.licenca = licenca.lerLicenca()
      }
      return resultado
    } catch (err) {
      return { ok: false, motivo: 'erro_rede', mensagem: err.message }
    }
  })

  ipcMain.handle('licenca:desativar', async () => {
    try {
      const resultado = await licenca.desativar()
      if (resultado.ok) {
        appState.ativo = false
        appState.licenca = null
      }
      return resultado
    } catch (err) {
      return { ok: false, motivo: 'erro_rede', mensagem: err.message }
    }
  })

  // ── Produtos ─────────────────────────────────────────────────────────────
  handle('produtos:listar', () => produtos.listar())
  handle('produtos:listarAtivos', () => produtos.listarAtivos())
  handle('produtos:criar', (args) => produtos.criar(args))
  handle('produtos:editar', (args) => produtos.editar(args))
  handle('produtos:toggleAtivo', (args) => produtos.toggleAtivo(args))
  handle('produtos:apagar', (args) => produtos.apagar(args))

  ipcMain.handle('produtos:importarExcel', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Selecionar planilha de produtos',
        filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
        properties: ['openFile'],
      })
      if (canceled || filePaths.length === 0) return { ok: false, cancelado: true }

      const XLSX = require('xlsx')
      const wb = XLSX.readFile(filePaths[0])
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      let importados = 0
      const erros = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const nome = row['Produto'] || row['produto'] || row['Nome'] || row['nome'] || row['PRODUTO'] || row['NOME']
        const precoRaw = row['Preço'] || row['Preco'] || row['preco'] || row['PREÇO'] || row['Price'] || row['price']
        const categoriaRaw = row['Categoria'] || row['categoria'] || row['CATEGORIA'] || row['Category']

        if (!nome) { erros.push({ linha: i + 2, erro: 'Nome ausente' }); continue }
        const preco = parseFloat(String(precoRaw).replace(',', '.'))
        if (isNaN(preco) || preco <= 0) { erros.push({ linha: i + 2, erro: `Preço inválido: ${precoRaw}` }); continue }

        try {
          produtos.criar({
            nome: String(nome).trim(),
            preco,
            categoria: categoriaRaw ? String(categoriaRaw).trim() : null,
          })
          importados++
        } catch (err) {
          erros.push({ linha: i + 2, erro: err.message })
        }
      }

      return { ok: true, importados, erros }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // ── Comandas ─────────────────────────────────────────────────────────────
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
  handle('comandas:limparHistorico', () => comandas.limparHistorico())

  // ── Itens ────────────────────────────────────────────────────────────────
  handle('itens:listarPorComanda', (args) => itens.listarPorComanda(args.comanda_id))
  handle('itens:adicionar', (args) => itens.adicionar(args))
  handle('itens:atualizarQuantidade', (args) => itens.atualizarQuantidade(args))
  handle('itens:remover', (args) => itens.remover(args))

  // ── PIX ──────────────────────────────────────────────────────────────────
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
