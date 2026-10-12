export type TextBlock = {
  id: string
  type: 'text'
  text: string
}

export type ImageBlock = {
  id: string
  type: 'image'
  src: string
  name: string
}

export type Block = TextBlock | ImageBlock

export type Note = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  blocks: Block[]
}

export type NoteSummary = {
  id: string
  title: string
  excerpt: string
  updatedAt: number
  imageCount: number
}

const ID_PATTERN = /^[a-zA-Z0-9-]{1,80}$/

export function isSafeId(id: string): boolean {
  return ID_PATTERN.test(id)
}

export function displayTitle(title: string): string {
  const trimmed = title.trim()
  return trimmed.length > 0 ? trimmed : 'Untitled'
}

export function plainText(note: Pick<Note, 'blocks'>): string {
  return note.blocks
    .filter((block): block is TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

export function excerptOf(note: Pick<Note, 'blocks'>): string {
  return plainText(note).replace(/\s+/g, ' ').trim().slice(0, 140)
}

export function imageCountOf(note: Pick<Note, 'blocks'>): number {
  return note.blocks.filter((block) => block.type === 'image').length
}

export function wordCount(note: Pick<Note, 'blocks'>): number {
  const words = plainText(note).trim().match(/\S+/g)
  return words?.length ?? 0
}

export function summarize(note: Note): NoteSummary {
  return {
    id: note.id,
    title: displayTitle(note.title),
    excerpt: excerptOf(note),
    updatedAt: note.updatedAt,
    imageCount: imageCountOf(note)
  }
}

export function toMarkdown(note: Note): string {
  const body = note.blocks
    .map((block) => {
      if (block.type === 'text') return block.text.trim()
      return `![${block.name}](${block.src})`
    })
    .filter((part) => part.length > 0)
    .join('\n\n')

  return `# ${displayTitle(note.title)}\n\n${body}\n`
}

export function createWelcomeNote(now = Date.now()): Note {
  return {
    id: 'welcome',
    title: 'A desk of your own',
    createdAt: now,
    updatedAt: now,
    blocks: [
      {
        id: 'welcome-body',
        type: 'text',
        text: [
          'This page lives on your computer, in your Documents folder.',
          'Write the way you would on paper. Paste an image and it stays with the note. Nothing here is uploaded.',
          'The list on the left is only an index. The words are files you can copy, move, or back up yourself.'
        ].join('\n\n')
      }
    ]
  }
}

export function createEmptyNote(now = Date.now()): Note {
  return {
    id: crypto.randomUUID(),
    title: '',
    createdAt: now,
    updatedAt: now,
    blocks: [{ id: crypto.randomUUID(), type: 'text', text: '' }]
  }
}
