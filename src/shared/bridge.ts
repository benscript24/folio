import type { Note, NoteSummary } from './note'

export type ImagePayload = {
  mime: string
  data: string
}

export interface FolioBridge {
  libraryPath: () => Promise<string>
  revealLibrary: () => Promise<void>
  listNotes: () => Promise<NoteSummary[]>
  readNote: (id: string) => Promise<Note>
  saveNote: (note: Note) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  saveImage: (noteId: string, name: string, bytes: Uint8Array) => Promise<string>
  readImage: (noteId: string, src: string) => Promise<ImagePayload>
  deleteImage: (noteId: string, src: string) => Promise<void>
  setTheme: (theme: 'light' | 'dark') => Promise<void>
}
