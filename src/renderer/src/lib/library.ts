import {
  createWelcomeNote,
  summarize,
  type Note,
  type NoteSummary
} from '../../../shared/note'

const KEY = 'folio.library.v1'
const imageUrls = new Map<string, string>()

function readStored(): Note[] {
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    const welcome = createWelcomeNote()
    localStorage.setItem(KEY, JSON.stringify([welcome]))
    return [welcome]
  }
  return JSON.parse(raw) as Note[]
}

function writeStored(notes: Note[]): void {
  localStorage.setItem(KEY, JSON.stringify(notes))
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

function browserLibrary() {
  return {
    async location(): Promise<string> {
      return 'Browser preview'
    },
    async reveal(): Promise<void> {},
    async list(): Promise<NoteSummary[]> {
      return readStored()
        .map(summarize)
        .sort((a, b) => b.updatedAt - a.updatedAt)
    },
    async read(id: string): Promise<Note> {
      const note = readStored().find((item) => item.id === id)
      if (!note) throw new Error('Note not found')
      return note
    },
    async save(note: Note): Promise<void> {
      const notes = readStored().filter((item) => item.id !== note.id)
      notes.push(note)
      writeStored(notes)
    },
    async remove(id: string): Promise<void> {
      writeStored(readStored().filter((item) => item.id !== id))
    },
    async saveImage(_noteId: string, file: File): Promise<string> {
      return fileToDataUrl(file)
    },
    async imageUrl(noteId: string, src: string): Promise<string> {
      void noteId
      return src
    },
    async deleteImage(_noteId: string, _src: string): Promise<void> {}
  }
}

function electronLibrary(bridge: NonNullable<Window['folio']>) {
  return {
    location: () => bridge.libraryPath(),
    reveal: () => bridge.revealLibrary(),
    list: () => bridge.listNotes(),
    read: (id: string) => bridge.readNote(id),
    save: (note: Note) => bridge.saveNote(note),
    remove: (id: string) => bridge.deleteNote(id),
    async saveImage(noteId: string, file: File): Promise<string> {
      const bytes = new Uint8Array(await file.arrayBuffer())
      return bridge.saveImage(noteId, file.name || 'image.png', bytes)
    },
    async imageUrl(noteId: string, src: string): Promise<string> {
      if (src.startsWith('data:')) return src
      const key = `${noteId}:${src}`
      const cached = imageUrls.get(key)
      if (cached) return cached
      const image = await bridge.readImage(noteId, src)
      const url = `data:${image.mime};base64,${image.data}`
      imageUrls.set(key, url)
      return url
    },
    async deleteImage(noteId: string, src: string): Promise<void> {
      if (src.startsWith('data:') || src.startsWith('blob:')) return
      imageUrls.delete(`${noteId}:${src}`)
      await bridge.deleteImage(noteId, src)
    }
  }
}

export type LibraryClient = ReturnType<typeof browserLibrary>

export const library: LibraryClient =
  typeof window !== 'undefined' && window.folio ? electronLibrary(window.folio) : browserLibrary()
