import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { createLibrary } from './library'
import type { Note } from '../shared/note'

const library = createLibrary(join(app.getPath('documents'), 'Folio'))

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    show: false,
    backgroundColor: '#1c1c1f',
    autoHideMenuBar: true,
    title: 'Folio',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1c1c1f',
      symbolColor: '#c7c7ce',
      height: 48
    },
    roundedCorners: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function paintTitleBar(win: BrowserWindow, theme: 'light' | 'dark'): void {
  win.setTitleBarOverlay({
    color: theme === 'light' ? '#f5f5f7' : '#1c1c1f',
    symbolColor: theme === 'light' ? '#3a3a42' : '#c7c7ce',
    height: 48
  })
}

function asBuffer(bytes: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
}

app.whenReady().then(async () => {
  await library.ensure()

  ipcMain.handle('library:path', () => library.root)
  ipcMain.handle('library:reveal', () => shell.openPath(library.root))
  ipcMain.handle('notes:list', () => library.listNotes())
  ipcMain.handle('notes:read', (_event, id: string) => library.readNote(id))
  ipcMain.handle('notes:save', (_event, note: Note) => library.writeNote(note))
  ipcMain.handle('notes:delete', (_event, id: string) => library.deleteNote(id))
  ipcMain.handle('window:theme', (event, theme: 'light' | 'dark') => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && (theme === 'light' || theme === 'dark')) paintTitleBar(win, theme)
  })
  ipcMain.handle('images:save', (_event, noteId: string, name: string, bytes: Uint8Array) =>
    library.saveImage(noteId, name, asBuffer(bytes))
  )
  ipcMain.handle('images:read', (_event, noteId: string, src: string) => library.readImage(noteId, src))
  ipcMain.handle('images:delete', (_event, noteId: string, src: string) =>
    library.deleteImage(noteId, src)
  )

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
