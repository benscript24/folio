import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { Note } from '../../../shared/note'
import { displayTitle, plainText, wordCount } from '../../../shared/note'
import { FocusIcon, ImageIcon, LibraryIcon, RestoreIcon, TrashIcon } from './Icons'
import { RichEditor, type RichEditorHandle } from './RichEditor'

type SaveState = 'saved' | 'saving' | 'error'

type Panels = { rail: boolean; index: boolean }

type Props = {
  note: Note
  saveState: SaveState
  focusMode: boolean
  panels: Panels
  onChange: (note: Note) => void
  onDelete: () => void
  onRestore: () => void
  onToggleLibrary: () => void
  onSetPanel: (part: keyof Panels, open: boolean) => void
  titleRef: RefObject<HTMLTextAreaElement | null>
}

function filesFromList(list: FileList | File[]): File[] {
  return [...list].filter((file) => file.type.startsWith('image/'))
}

export function Editor({
  note,
  saveState,
  focusMode,
  panels,
  onChange,
  onDelete,
  onRestore,
  onToggleLibrary,
  onSetPanel,
  titleRef
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const richRef = useRef<RichEditorHandle>(null)
  const [dropping, setDropping] = useState(false)
  const [confirming, setConfirming] = useState<'move' | 'forever' | null>(null)
  const [adding, setAdding] = useState(false)
  const inputId = useId()
  const words = wordCount(note)
  const showPlaceholder = plainText(note).trim().length === 0
  const readOnly = Boolean(note.deletedAt)

  useLayoutEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = '0px'
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
    }
  }, [note.title, titleRef])

  useEffect(() => {
    setConfirming(null)
  }, [note.id])

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
        <div className="editor-bar-start">
          <button
            type="button"
            className="panel-toggle"
            onClick={onToggleLibrary}
            aria-pressed={focusMode}
            title={focusMode ? 'Show sidebars' : 'Hide sidebars for full view'}
          >
            {focusMode ? 'Sidebars' : 'Full view'}
          </button>
          {!panels.rail && panels.index && (
            <button type="button" className="panel-toggle subtle" onClick={() => onSetPanel('rail', true)}>
              Nav
            </button>
          )}
          {panels.rail && !panels.index && (
            <button type="button" className="panel-toggle subtle" onClick={() => onSetPanel('index', true)}>
              Notes
            </button>
          )}
        </div>
        <span className="privacy">On this computer</span>
        <span className={saveState === 'error' ? 'save-pill bad' : 'save-pill'} aria-live="polite">
          {saveLabel}
        </span>
      </header>
      <div className="stage-scroll">
        <div
          className={dropping ? 'sheet dropping' : 'sheet'}
          onDragEnter={(event) => {
            if (readOnly) return
            if (![...event.dataTransfer.items].some((item) => item.type.startsWith('image/'))) return
            event.preventDefault()
            setDropping(true)
          }}
          onDragOver={(event) => {
            if (readOnly) return
            if (![...event.dataTransfer.items].some((item) => item.type.startsWith('image/'))) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
            setDropping(false)
          }}
          onDrop={(event) => {
            if (readOnly) return
            event.preventDefault()
            setDropping(false)
            const files = filesFromList(event.dataTransfer.files)
            if (files.length > 0) richRef.current?.insertImages(files)
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
            readOnly={readOnly}
            onChange={(event) => onChange({ ...note, title: event.target.value, updatedAt: Date.now() })}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || readOnly) return
              event.preventDefault()
              document.querySelector<HTMLElement>('.prose-mirror')?.focus()
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
                <button
                  type="button"
                  onClick={() => setConfirming('forever')}
                  aria-label={`Delete ${displayTitle(note.title)} forever`}
                >
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
                <button type="button" onClick={onToggleLibrary} aria-pressed={focusMode}>
                  {focusMode ? <LibraryIcon /> : <FocusIcon />}
                  <span>{focusMode ? 'Sidebars' : 'Full view'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming('move')}
                  aria-label={`Move ${displayTitle(note.title)} to trash`}
                >
                  <TrashIcon />
                  <span>Trash</span>
                </button>
              </>
            )}
          </div>
          <RichEditor
            ref={richRef}
            note={note}
            readOnly={readOnly}
            placeholder={showPlaceholder ? 'Write…' : ''}
            onChange={onChange}
          />
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
          const files = filesFromList(event.target.files ?? [])
          if (files.length === 0) return
          setAdding(true)
          richRef.current?.insertImages(files)
          setAdding(false)
          if (fileRef.current) fileRef.current.value = ''
        }}
      />
    </>
  )
}
