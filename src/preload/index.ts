import { contextBridge, ipcRenderer } from 'electron'
import type { FolioBridge } from '../shared/bridge'
import type { Note } from '../shared/note'

const folio: FolioBridge = {
  libraryPath: () => ipcRenderer.invoke('library:path'),
  revealLibrary: () => ipcRenderer.invoke('library:reveal'),
  listNotes: () => ipcRenderer.invoke('notes:list'),
  listTrash: () => ipcRenderer.invoke('notes:trash'),
  readNote: (id: string): Promise<Note> => ipcRenderer.invoke('notes:read', id),
  saveNote: (note: Note): Promise<void> => ipcRenderer.invoke('notes:save', note),
  deleteNote: (id: string): Promise<void> => ipcRenderer.invoke('notes:delete', id),
  saveImage: (noteId: string, name: string, bytes: Uint8Array): Promise<string> =>
    ipcRenderer.invoke('images:save', noteId, name, bytes),
  readImage: (noteId: string, src: string): Promise<{ mime: string; data: string }> =>
    ipcRenderer.invoke('images:read', noteId, src),
  deleteImage: (noteId: string, src: string): Promise<void> =>
    ipcRenderer.invoke('images:delete', noteId, src),
  setTheme: (theme: 'light' | 'dark'): Promise<void> => ipcRenderer.invoke('window:theme', theme)
}

contextBridge.exposeInMainWorld('folio', folio)
