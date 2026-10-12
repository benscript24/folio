import type { Block, ImageBlock, Note } from '../../../shared/note'

export function insertImages(
  note: Note,
  images: ImageBlock[],
  blockId: string | null,
  cursor: number | null
): { note: Note; focusId: string } {
  const focusId = crypto.randomUUID()
  const trailing: Block = { id: focusId, type: 'text', text: '' }

  if (!blockId) {
    const blocks = [...note.blocks]
    const last = blocks[blocks.length - 1]
    if (last?.type === 'text' && last.text.trim() === '') blocks.pop()
    return {
      focusId,
      note: { ...note, updatedAt: Date.now(), blocks: [...blocks, ...images, trailing] }
    }
  }

  const blocks: Block[] = []
  for (const block of note.blocks) {
    if (block.type !== 'text' || block.id !== blockId) {
      blocks.push(block)
      continue
    }
    const at = cursor ?? block.text.length
    const before = block.text.slice(0, at)
    const after = block.text.slice(at)
    if (before.length > 0) blocks.push({ ...block, text: before })
    blocks.push(...images)
    blocks.push({ id: focusId, type: 'text', text: after })
  }

  return { note: { ...note, updatedAt: Date.now(), blocks }, focusId }
}

export function removeImage(note: Note, imageId: string): Note {
  const blocks: Block[] = []
  for (const block of note.blocks) {
    if (block.id === imageId) continue
    const previous = blocks[blocks.length - 1]
    if (block.type === 'text' && previous?.type === 'text') {
      const merged = [previous.text, block.text].filter((part) => part.length > 0).join('\n\n')
      blocks[blocks.length - 1] = { ...previous, text: merged }
    } else {
      blocks.push(block)
    }
  }
  if (!blocks.some((block) => block.type === 'text')) {
    blocks.push({ id: crypto.randomUUID(), type: 'text', text: '' })
  }
  return { ...note, updatedAt: Date.now(), blocks }
}
