const { autoUpdater } = require('electron-updater')
const { dialog, app } = require('electron')

// Intervalo de verificação automática: a cada 4 horas
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

function configurarUpdater() {
  // Não verificar em desenvolvimento
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Atualização pronta',
        message: 'Uma nova versão do TabPraia foi baixada.',
        detail: 'Reinicie o app para aplicar a atualização.',
        buttons: ['Reiniciar agora', 'Mais tarde'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
  })

  autoUpdater.on('error', (err) => {
    // Erros de update não devem bloquear o app — apenas loga silenciosamente
    console.error('[updater]', err.message)
  })

  // Verifica ao iniciar
  autoUpdater.checkForUpdates().catch(() => {})

  // Verifica periodicamente enquanto o app está aberto
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, CHECK_INTERVAL_MS)
}

module.exports = { configurarUpdater }
