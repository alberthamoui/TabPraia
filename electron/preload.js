const { contextBridge, ipcRenderer } = require('electron')

const channels = [
  // Licença
  'licenca:status',
  'licenca:ativar',
  'licenca:validar',
  'licenca:desativar',
  // Produtos
  'produtos:listar',
  'produtos:listarAtivos',
  'produtos:criar',
  'produtos:editar',
  'produtos:toggleAtivo',
  'produtos:apagar',
  'produtos:importarExcel',
  'produtos:baixarModeloExcel',
  // Comandas
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
  'comandas:indicadoresPeriodo',
  'comandas:produtosMaisVendidosPeriodo',
  'comandas:limparHistorico',
  // Itens
  'itens:listarPorComanda',
  'itens:adicionar',
  'itens:atualizarQuantidade',
  'itens:remover',
  // PIX
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
