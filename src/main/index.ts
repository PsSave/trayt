import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } from 'electron'
import { join } from 'node:path'
import { is } from './is'
import { providers } from './providers/registry'

const MARGIN = 8

let tray: Tray | null = null
let popover: BrowserWindow | null = null
let pendingAnchor: 'top' | 'bottom' | null = null
let currentPlacement: { workArea: Electron.Rectangle; anchor: 'top' | 'bottom' } | null = null

function createPopover(): BrowserWindow {
  const win = new BrowserWindow({
    width: 328,
    height: 260, // corrected immediately after mount via 'trayt:resize' — see resizePopoverTo
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    skipTaskbar: true,
    hasShadow: false, // the shadow is CSS; avoids a rectangular frame on some WMs
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('blur', () => win.hide())

  win.webContents.on('did-finish-load', () => {
    if (pendingAnchor) {
      win.webContents.send('trayt:shown', { anchor: pendingAnchor })
      pendingAnchor = null
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

/**
 * `tray.getBounds()` / the 'click' event's bounds return an all-zero rect on
 * most Linux Wayland sessions — AppIndicator/SNI (the tray backend Electron
 * uses there) doesn't expose icon geometry to the client at all. Confirmed on
 * KDE Plasma + Wayland via TRAYT_DEBUG_ANCHOR: `screen.getCursorScreenPoint()`
 * is *also* unreliable in that case (Wayland hides the real global cursor
 * position from clients), so it can point at the wrong monitor entirely on a
 * multi-monitor setup. On X11 and Windows neither of these is an issue — the
 * bounds/cursor logic below is untouched for those.
 *
 * So: only when bounds are unusable AND we're on Wayland do we give up on
 * "where was the click" and anchor to a fixed, predictable corner of the
 * primary display instead of a signal we know is unreliable. This is a
 * documented platform limitation, not a guess — see docs/ARCHITECTURE.md.
 */
const isWayland = process.platform === 'linux' && Boolean(process.env['WAYLAND_DISPLAY'])
// Most Wayland DEs put the tray at the end of a top bar (GNOME) except KDE
// Plasma, whose default panel — and this project's own dev environment — is
// at the bottom. Best-effort until Electron/Wayland exposes real geometry.
const waylandFallbackAnchor: 'top' | 'bottom' =
  process.env['XDG_CURRENT_DESKTOP']?.toLowerCase().includes('gnome') ? 'top' : 'bottom'

function anchorPoint(
  clickBounds: Electron.Rectangle
): { x: number; y: number; anchor: 'top' | 'bottom'; workArea: Electron.Rectangle } {
  const cursor = screen.getCursorScreenPoint()
  const boundsUsable = clickBounds.width > 0 && clickBounds.height > 0
  const { width: w, height: h } = popover!.getBounds()

  let workArea: Electron.Rectangle
  let x: number
  let anchor: 'top' | 'bottom'

  if (boundsUsable) {
    const point = { x: Math.round(clickBounds.x + clickBounds.width / 2), y: Math.round(clickBounds.y + clickBounds.height / 2) }
    ;({ workArea } = screen.getDisplayNearestPoint(point))
    anchor = point.y > workArea.y + workArea.height / 2 ? 'bottom' : 'top'
    x = Math.min(Math.max(point.x - w / 2, workArea.x + MARGIN), workArea.x + workArea.width - w - MARGIN)
  } else if (!isWayland) {
    // X11: the cursor position is trustworthy, and a click necessarily happened at it.
    ;({ workArea } = screen.getDisplayNearestPoint(cursor))
    anchor = cursor.y > workArea.y + workArea.height / 2 ? 'bottom' : 'top'
    x = Math.min(Math.max(cursor.x - w / 2, workArea.x + MARGIN), workArea.x + workArea.width - w - MARGIN)
  } else {
    // Wayland with no geometry signal at all: fixed corner of the primary display.
    ;({ workArea } = screen.getPrimaryDisplay())
    anchor = waylandFallbackAnchor
    x = workArea.x + workArea.width - w - MARGIN
  }

  const y = anchor === 'bottom' ? workArea.y + workArea.height - h - MARGIN : workArea.y + MARGIN

  if (process.env['TRAYT_DEBUG_ANCHOR']) {
    console.log('[trayt:anchor]', { clickBounds, boundsUsable, isWayland, cursor, workArea, result: { x, y, anchor } })
  }

  return { x: Math.round(x), y: Math.round(y), anchor, workArea }
}

function togglePopover(_event: Electron.KeyboardEvent, clickBounds: Electron.Rectangle): void {
  if (!popover) popover = createPopover()
  if (popover.isVisible()) {
    popover.hide()
    return
  }

  const { x, y, anchor, workArea } = anchorPoint(clickBounds)
  currentPlacement = { workArea, anchor }
  popover.setPosition(x, y, false)
  popover.show()
  popover.focus()

  if (popover.webContents.isLoadingMainFrame()) {
    pendingAnchor = anchor
  } else {
    popover.webContents.send('trayt:shown', { anchor })
  }
}

/**
 * The card's real height depends on its content (how many providers, whether
 * a row is showing two quota bars or a one-line note) — a fixed window height
 * either clips a rounded corner when content is taller than guessed, or
 * leaves dead space when it's shorter. The renderer measures itself
 * (ResizeObserver on .card-shell) and reports the height it actually needs;
 * this repositions using the placement recorded when the popover was shown,
 * so the edge it's anchored to (e.g. sitting just above a bottom panel)
 * doesn't drift as the height changes.
 */
function resizePopoverTo(height: number): void {
  if (!popover || !currentPlacement) return
  const { workArea, anchor } = currentPlacement
  const { x, width } = popover.getBounds()
  // Clamp so a very tall card grows back up toward the anchor edge instead of
  // running off the bottom/top of the screen.
  const clampedHeight = Math.min(Math.round(height), workArea.height - 2 * MARGIN)
  const y = anchor === 'bottom' ? workArea.y + workArea.height - clampedHeight - MARGIN : workArea.y + MARGIN
  popover.setBounds({ x, y: Math.round(y), width, height: clampedHeight })
}

app.whenReady().then(() => {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/tray-icon.png'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('trayt — AI agent usage')
  tray.on('click', togglePopover)
  tray.setContextMenu(
    Menu.buildFromTemplate([{ label: 'Quit trayt', click: () => app.quit() }])
  )

  ipcMain.on('trayt:resize', (_event, height: number) => resizePopoverTo(height))

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
