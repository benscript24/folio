import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, join, resolve, sep } from 'path'
import {
  createWelcomeNote,
  isSafeId,
  summarize,
  toMarkdown,
  type Note,
  type NoteSummary
} from '../shared/note'

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'])

function assertId(id: string): void {
  if (!isSafeId(id)) throw new Error('Invalid note id')
}

function inside(root: string, target: string): string {
  const full = resolve(root, target)
  const base = resolve(root)
  if (full !== base && !full.startsWith(base + sep)) {
    throw new Error('Path escapes the library')
  }
  return full
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await readFile(path)
    return true
  } catch {
    return false
  }
}

export function createLibrary(root: string) {
  const notesDir = () => join(root, 'notes')

  async function ensure(): Promise<void> {
    await mkdir(notesDir(), { recursive: true })
    const marker = join(root, '.initialized')
    if (await pathExists(marker)) return
    await writeNote(createWelcomeNote())
    await writeFile(marker, 'folio\n', 'utf8')
  }

  function noteDir(id: string): string {
    assertId(id)
    return inside(notesDir(), id)
  }

  async function writeNote(note: Note): Promise<void> {
    assertId(note.id)
    const dir = noteDir(note.id)
    await mkdir(join(dir, 'images'), { recursive: true })
    const json = JSON.stringify(note, null, 2)
    await writeFile(join(dir, 'note.json'), json, 'utf8')
    await writeFile(join(dir, 'note.md'), toMarkdown(note), 'utf8')
  }

  async function readNote(id: string): Promise<Note> {
    const file = join(noteDir(id), 'note.json')
    const raw = await readFile(file, 'utf8')
    return JSON.parse(raw) as Note
  }

  async function listNotes(): Promise<NoteSummary[]> {
    await ensure()
    const entries = await readdir(notesDir(), { withFileTypes: true })
    const summaries: NoteSummary[] = []
    for (const entry of entries) {
      if (!entry.isDirectory() || !isSafeId(entry.name)) continue
      try {
        const note = await readNote(entry.name)
        summaries.push(summarize(note))
      } catch {
        continue
      }
    }
    summaries.sort((a, b) => b.updatedAt - a.updatedAt)
    return summaries
  }

  async function saveImage(noteId: string, name: string, bytes: Buffer): Promise<string> {
    assertId(noteId)
    const extFromName = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : ''
    const ext = IMAGE_EXT.has(extFromName) ? extFromName : '.png'
    const filename = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}${ext}`
    const relative = join('images', filename)
    const full = inside(noteDir(noteId), relative)
    await mkdir(dirname(full), { recursive: true })
    await writeFile(full, bytes)
    return `images/${filename}`
  }

  async function readImage(noteId: string, src: string): Promise<{ mime: string; data: string }> {
    assertId(noteId)
    if (!src.startsWith('images/') || src.includes('..')) throw new Error('Invalid image')
    const full = inside(noteDir(noteId), src)
    const data = await readFile(full)
    const ext = src.slice(src.lastIndexOf('.')).toLowerCase()
    const mime =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.gif'
          ? 'image/gif'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.bmp'
              ? 'image/bmp'
              : 'image/png'
    return { mime, data: data.toString('base64') }
  }

  async function deleteImage(noteId: string, src: string): Promise<void> {
    assertId(noteId)
    if (!src.startsWith('images/') || src.includes('..')) return
    const full = inside(noteDir(noteId), src)
    await rm(full, { force: true })
  }

  async function deleteNote(id: string): Promise<void> {
    await rm(noteDir(id), { recursive: true, force: true })
  }

  return {
    root,
    ensure,
    listNotes,
    readNote,
    writeNote,
    saveImage,
    readImage,
    deleteImage,
    deleteNote
  }
}
