import type { Note } from '../../../shared/note'

/** Join legacy blocks into one markdown body for the rich editor. */
export function noteBodyMarkdown(note: Note): string {
  return note.blocks
    .map((block) => (block.type === 'text' ? block.text : `![${block.name}](${block.src})`))
    .filter((part) => part.length > 0)
    .join('\n\n')
}

/** Persist editor markdown as a single text block (images stay as `![](path)` in the text). */
export function applyBodyMarkdown(note: Note, body: string): Note {
  const existingText = note.blocks.find((block) => block.type === 'text')
  const textId = existingText?.id ?? crypto.randomUUID()
  return {
    ...note,
    updatedAt: Date.now(),
    blocks: [{ id: textId, type: 'text', text: body }]
  }
}

const IMAGE_MD = /!\[([^\]]*)\]\(([^)]+)\)/g

export function imagePathsInMarkdown(body: string): string[] {
  const paths: string[] = []
  for (const match of body.matchAll(IMAGE_MD)) {
    const src = match[2]?.trim()
    if (src && !src.startsWith('data:') && !src.startsWith('http')) paths.push(src)
  }
  return paths
}

/** Swap relative image paths for display URLs (and record the mapping for save). */
export async function markdownForDisplay(
  noteId: string,
  body: string,
  resolve: (noteId: string, src: string) => Promise<string>
): Promise<{ markdown: string; displayToStored: Map<string, string> }> {
  const displayToStored = new Map<string, string>()
  let markdown = body
  for (const match of [...body.matchAll(IMAGE_MD)]) {
    const full = match[0]
    const alt = match[1] ?? ''
    const stored = match[2]?.trim() ?? ''
    if (!stored || stored.startsWith('data:') || stored.startsWith('http')) continue
    try {
      const display = await resolve(noteId, stored)
      displayToStored.set(display, stored)
      markdown = markdown.replace(full, `![${alt}](${display})`)
    } catch {
      continue
    }
  }
  return { markdown, displayToStored }
}

export function markdownForStorage(body: string, displayToStored: Map<string, string>): string {
  let stored = body
  for (const [display, path] of displayToStored) {
    stored = stored.split(display).join(path)
  }
  return stored
}
