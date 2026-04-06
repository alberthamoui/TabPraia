const { contextBridge, ipcRenderer } = require('electron')

const channels = [
  'produtos:listar',
  'produtos:listarAtivos',
  'produtos:criar',
  'produtos:editar',
  'produtos:toggleAtivo',
  'comandas:listarAbertas',
  'comandas:listarFechadas',
  'comandas:buscarPorId',
  'comandas:clienteTemAberta',
  'comandas:criar',
  'comandas:fechar',
  'comandas:indicadoresDia',
  'comandas:indicadoresDashboard',
  'comandas:produtosMaisVendidosDia',
  'comandas:deletar',
  'itens:listarPorComanda',
  'itens:adicionar',
  'itens:atualizarQuantidade',
  'itens:remover',
  'pix:salvarConfig',
  'pix:obterConfig',
  'pix:gerarQR',
]

const api = {}
for (const ch of channels) {
  const key = ch.replace(':', '_').replace(/:/g, '_')
  api[key] = (args) => ipcRenderer.invoke(ch, args)
}

contextBridge.exposeInMainWorld('api', api)
