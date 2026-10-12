import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { Note, TextBlock } from '../../../shared/note'
import { displayTitle, plainText, wordCount } from '../../../shared/note'
import { insertImages, removeImage } from '../lib/blocks'
import { library } from '../lib/library'
import { FocusIcon, ImageIcon, LibraryIcon, RestoreIcon, TrashIcon } from './Icons'

type SaveState = 'saved' | 'saving' | 'error'

type Props = {
  note: Note
  saveState: SaveState
  focusMode: boolean
  onChange: (note: Note) => void
  onDelete: () => void
  onRestore: () => void
  onToggleFocus: () => void
  titleRef: RefObject<HTMLTextAreaElement | null>
}

function filesFromList(list: FileList | File[]): File[] {
  return [...list].filter((file) => file.type.startsWith('image/'))
}

function filesFromTransfer(data: DataTransfer): File[] {
  const fromFiles = filesFromList(data.files)
  if (fromFiles.length > 0) return fromFiles
  const found: File[] = []
  for (const item of data.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) found.push(file)
    }
  }
  return found
}

function Figure({
  noteId,
  src,
  name,
  onRemove
}: {
  noteId: string
  src: string
  name: string
  onRemove: () => void
}) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    setFailed(false)
    library
      .imageUrl(noteId, src)
      .then((next) => {
        if (live) setUrl(next)
      })
      .catch(() => {
        if (live) setFailed(true)
      })
    return () => {
      live = false
    }
  }, [noteId, src])

  return (
    <figure className="figure">
      {url && !failed ? (
        <img src={url} alt={name} />
      ) : (
        <div className="figure-pending">{failed ? 'Image unavailable' : ''}</div>
      )}
      <figcaption>
        <span>{name || 'Image'}</span>
        <button type="button" onClick={onRemove}>
          Remove
        </button>
      </figcaption>
    </figure>
  )
}

export function Editor({
  note,
  saveState,
  focusMode,
  onChange,
  onDelete,
  onRestore,
  onToggleFocus,
  titleRef
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const areas = useRef(new Map<string, HTMLTextAreaElement>())
  const cursorRef = useRef<{ id: string; cursor: number } | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)
  const [confirming, setConfirming] = useState<'move' | 'forever' | null>(null)
  const [adding, setAdding] = useState(false)
  const inputId = useId()
  const words = wordCount(note)
  const firstText = note.blocks.find((block): block is TextBlock => block.type === 'text')
  const showPlaceholder = plainText(note).trim().length === 0

  useLayoutEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = '0px'
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
    }
    for (const area of areas.current.values()) {
      area.style.height = '0px'
      area.style.height = `${area.scrollHeight}px`
    }
  }, [note, titleRef])

  useLayoutEffect(() => {
    if (!focusId) return
    const area = areas.current.get(focusId)
    area?.focus()
    const length = area?.value.length ?? 0
    area?.setSelectionRange(length, length)
    setFocusId(null)
  }, [focusId, note])

  useEffect(() => {
    setConfirming(null)
  }, [note.id])

  function register(id: string, node: HTMLTextAreaElement | null) {
    if (node) areas.current.set(id, node)
    else areas.current.delete(id)
  }

  function updateText(id: string, text: string) {
    onChange({
      ...note,
      updatedAt: Date.now(),
      blocks: note.blocks.map((block) => (block.id === id && block.type === 'text' ? { ...block, text } : block))
    })
  }

  async function addFiles(files: File[], blockId: string | null, cursor: number | null) {
    if (files.length === 0 || adding) return
    setAdding(true)
    try {
      const images = []
      for (const file of files) {
        const src = await library.saveImage(note.id, file)
        images.push({
          id: crypto.randomUUID(),
          type: 'image' as const,
          src,
          name: file.name || 'Image'
        })
      }
      const next = insertImages(note, images, blockId, cursor)
      onChange(next.note)
      setFocusId(next.focusId)
    } finally {
      setAdding(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function rememberCursor(id: string, area: HTMLTextAreaElement) {
    cursorRef.current = { id, cursor: area.selectionStart ?? area.value.length }
  }

  const date = new Date(note.updatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  const saveLabel = saveState === 'saving' ? 'Saving' : saveState === 'error' ? 'Not saved' : 'Saved'
  const wordLabel = words === 0 ? 'No words yet' : words === 1 ? '1 word' : `${words} words`

  return (
    <>
      <header className="editor-bar">
        <span className="privacy">On this computer</span>
        <span className={saveState === 'error' ? 'save-pill bad' : 'save-pill'} aria-live="polite">
          {saveLabel}
        </span>
      </header>
      <div className="stage-scroll">
        <div
          className={dropping ? 'sheet dropping' : 'sheet'}
          onDragEnter={(event) => {
            if (![...event.dataTransfer.items].some((item) => item.type.startsWith('image/'))) return
            event.preventDefault()
            setDropping(true)
          }}
          onDragOver={(event) => {
            if (![...event.dataTransfer.items].some((item) => item.type.startsWith('image/'))) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
            setDropping(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setDropping(false)
            const target = cursorRef.current
            void addFiles(filesFromTransfer(event.dataTransfer), target?.id ?? null, target?.cursor ?? null)
          }}
        >
          <textarea
            ref={titleRef}
            className="title"
            rows={1}
            value={note.title}
            placeholder="Untitled"
            aria-label="Title"
            spellCheck
            onChange={(event) => onChange({ ...note, title: event.target.value, updatedAt: Date.now() })}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || !firstText) return
              event.preventDefault()
              areas.current.get(firstText.id)?.focus()
            }}
          />
          <p className="meta">
            <span>{note.deletedAt ? 'In trash' : `Updated ${date}`}</span>
            <span aria-hidden="true">·</span>
            <span>{wordLabel}</span>
          </p>
          <div className={confirming ? 'tools confirm' : 'tools'}>
            {confirming === 'move' ? (
              <>
                <p>Move this note to trash?</p>
                <button type="button" onClick={() => setConfirming(null)}>
                  Keep
                </button>
                <button type="button" className="danger" onClick={onDelete}>
                  Trash
                </button>
              </>
            ) : confirming === 'forever' ? (
              <>
                <p>Delete this note forever?</p>
                <button type="button" onClick={() => setConfirming(null)}>
                  Keep
                </button>
                <button type="button" className="danger" onClick={onDelete}>
                  Delete
                </button>
              </>
            ) : note.deletedAt ? (
              <>
                <button type="button" onClick={onRestore}>
                  <RestoreIcon />
                  <span>Restore</span>
                </button>
                <button type="button" onClick={() => setConfirming('forever')} aria-label={`Delete ${displayTitle(note.title)} forever`}>
                  <TrashIcon />
                  <span>Delete forever</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={adding}>
                  <ImageIcon />
                  <span>{adding ? 'Adding' : 'Image'}</span>
                </button>
                <button type="button" onClick={onToggleFocus} aria-pressed={focusMode}>
                  {focusMode ? <LibraryIcon /> : <FocusIcon />}
                  <span>{focusMode ? 'Library' : 'Focus'}</span>
                </button>
                <button type="button" onClick={() => setConfirming('move')} aria-label={`Move ${displayTitle(note.title)} to trash`}>
                  <TrashIcon />
                  <span>Trash</span>
                </button>
              </>
            )}
          </div>
          <div
            className="blocks"
            onMouseDown={(event) => {
              if (event.target !== event.currentTarget) return
              const last = [...note.blocks].reverse().find((block) => block.type === 'text')
              if (last) areas.current.get(last.id)?.focus()
            }}
          >
            {note.blocks.map((block) =>
              block.type === 'text' ? (
                <textarea
                  key={block.id}
                  className="prose"
                  rows={1}
                  ref={(node) => register(block.id, node)}
                  value={block.text}
                  placeholder={showPlaceholder && block.id === firstText?.id ? 'Write…' : ''}
                  aria-label="Note"
                  spellCheck
                  onChange={(event) => updateText(block.id, event.target.value)}
                  onKeyUp={(event) => rememberCursor(block.id, event.currentTarget)}
                  onClick={(event) => rememberCursor(block.id, event.currentTarget)}
                  onPaste={(event) => {
                    const files = filesFromTransfer(event.clipboardData)
                    if (files.length === 0) return
                    event.preventDefault()
                    void addFiles(files, block.id, event.currentTarget.selectionStart)
                  }}
                />
              ) : (
                <Figure
                  key={block.id}
                  noteId={note.id}
                  src={block.src}
                  name={block.name}
                  onRemove={() => {
                    if (!block.src.startsWith('data:')) void library.deleteImage(note.id, block.src)
                    onChange(removeImage(note, block.id))
                  }}
                />
              )
            )}
          </div>
        </div>
      </div>
      <input
        id={inputId}
        ref={fileRef}
        className="sr"
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
        multiple
        onChange={(event) => {
          const target = cursorRef.current
          void addFiles(filesFromList(event.target.files ?? []), target?.id ?? null, target?.cursor ?? null)
        }}
      />
    </>
  )
}
