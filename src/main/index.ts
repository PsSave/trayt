import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } from 'electron'
import { join } from 'node:path'
import { is } from './is'
import { providers } from './providers/registry'

let tray: Tray | null = null
let popover: BrowserWindow | null = null

function createPopover(): BrowserWindow {
  const win = new BrowserWindow({
    width: 340,
    height: 420,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('blur', () => win.hide())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function togglePopover(): void {
  if (!popover) popover = createPopover()
  if (popover.isVisible()) {
    popover.hide()
    return
  }

  const trayBounds = tray!.getBounds()
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y })
  const winBounds = popover.getBounds()

  const x = Math.round(
    Math.min(
      Math.max(trayBounds.x - winBounds.width / 2 + trayBounds.width / 2, display.workArea.x),
      display.workArea.x + display.workArea.width - winBounds.width
    )
  )
  // Place above the tray icon on Windows taskbars (bottom), below on Linux top panels.
  const y = trayBounds.y > display.workArea.height / 2
    ? Math.round(trayBounds.y - winBounds.height)
    : Math.round(trayBounds.y + trayBounds.height)

  popover.setPosition(x, y, false)
  popover.show()
  popover.focus()
}

app.whenReady().then(() => {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/tray-icon.png'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('trayt — AI agent usage')
  tray.on('click', togglePopover)
  tray.setContextMenu(
    Menu.buildFromTemplate([{ label: 'Quit trayt', click: () => app.quit() }])
  )

  ipcMain.handle('trayt:getUsage', async () => {
    return Promise.all(
      providers.map(async (provider) => ({
        id: provider.id,
        name: provider.name,
        usage: await provider.getUsage().catch((err) => ({
          status: 'error' as const,
          message: err instanceof Error ? err.message : String(err)
        }))
      }))
    )
  })
})

// No 'window-all-closed' handler on purpose: trayt has no main window, so the
// default (stay running, since we never call app.quit() ourselves) is exactly
// the tray-resident behavior we want.
