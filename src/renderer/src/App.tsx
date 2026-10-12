import { useCallback, useEffect, useRef, useState } from 'react'
import { createEmptyNote, displayTitle, summarize, type Note, type NoteSummary } from '../../shared/note'
import { Editor } from './components/Editor'
import { Rail } from './components/Rail'
import { Sidebar } from './components/Sidebar'
import { library } from './lib/library'

type SaveState = 'saved' | 'saving' | 'error'

const shortcut = /Mac/i.test(navigator.platform) ? '⌘N' : 'Ctrl N'

const THEME_KEY = 'folio.theme'

function readTheme(): 'light' | 'dark' {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
}

export function App() {
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [trash, setTrash] = useState<NoteSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Note | null>(null)
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [ready, setReady] = useState(false)
  const draftRef = useRef<Note | null>(null)
  const timer = useRef<number | null>(null)
  const titleRef = useRef<HTMLTextAreaElement | null>(null)
  const focusTitle = useRef(false)
  const creating = useRef(false)
  const [filter, setFilter] = useState<'all' | 'images' | 'trash'>('all')
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme)

  const flush = useCallback(async () => {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    const current = draftRef.current
    if (!current) return
    try {
      await library.save(current)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }, [])

  const scheduleSave = useCallback(
    (note: Note) => {
      draftRef.current = note
      if (timer.current) window.clearTimeout(timer.current)
      setSaveState('saving')
      timer.current = window.setTimeout(() => {
        void flush()
      }, 380)
    },
    [flush]
  )

  function applyDraft(note: Note) {
    if (draftRef.current && draftRef.current.id !== note.id) return
    setDraft(note)
    draftRef.current = note
    setNotes((current) => current.map((item) => (item.id === note.id ? summarize(note) : item)))
    setTrash((current) => current.map((item) => (item.id === note.id ? summarize(note) : item)))
    scheduleSave(note)
  }

  const openNote = useCallback(
    async (id: string) => {
      if (id === draftRef.current?.id) return
      await flush()
      const note = await library.read(id)
      setActiveId(note.id)
      setDraft(note)
      draftRef.current = note
      setSaveState('saved')
    },
    [flush]
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
    void window.folio?.setTheme(theme)
  }, [theme])

  useEffect(() => {
    let live = true
    void (async () => {
      const [list, trashed, where] = await Promise.all([library.list(), library.listTrash(), library.location()])
      if (!live) return
      setNotes(list)
      setTrash(trashed)
      setLocation(where)
      if (list[0]) {
        const note = await library.read(list[0].id)
        if (!live) return
        setActiveId(note.id)
        setDraft(note)
        draftRef.current = note
      }
      setReady(true)
    })()
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!focusTitle.current || !draft) return
    focusTitle.current = false
    titleRef.current?.focus()
  }, [draft])

  useEffect(() => {
    document.title = draft ? `${displayTitle(draft.title)} — Folio` : 'Folio'
  }, [draft])

  const createNote = useCallback(async () => {
    if (creating.current) return
    creating.current = true
    try {
      await flush()
      const note = createEmptyNote()
      await library.save(note)
      setNotes((current) => [summarize(note), ...current.filter((item) => item.id !== note.id)])
      setActiveId(note.id)
      setDraft(note)
      draftRef.current = note
      setSaveState('saved')
      setQuery('')
      setFilter('all')
      focusTitle.current = true
    } finally {
      creating.current = false
    }
  }, [flush])

  async function openRemaining(remaining: NoteSummary[]) {
    if (remaining[0]) {
      const note = await library.read(remaining[0].id)
      setActiveId(note.id)
      setDraft(note)
      draftRef.current = note
    } else {
      setActiveId(null)
      setDraft(null)
      draftRef.current = null
    }
    setSaveState('saved')
  }

  async function moveToTrash() {
    const current = draftRef.current
    if (!current || current.deletedAt) return
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    const trashed = { ...current, deletedAt: Date.now() }
    draftRef.current = null
    await library.save(trashed)
    const summary = summarize(trashed)
    const remaining = notes.filter((item) => item.id !== current.id)
    setNotes(remaining)
    setTrash((currentTrash) => [summary, ...currentTrash.filter((item) => item.id !== current.id)])
    await openRemaining(remaining)
  }

  async function restoreNote() {
    const current = draftRef.current
    if (!current?.deletedAt) return
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    const restored = { ...current, deletedAt: null, updatedAt: Date.now() }
    await library.save(restored)
    const summary = summarize(restored)
    setTrash((currentTrash) => currentTrash.filter((item) => item.id !== current.id))
    setNotes((currentNotes) => [summary, ...currentNotes.filter((item) => item.id !== current.id)])
    setFilter('all')
    setActiveId(restored.id)
    setDraft(restored)
    draftRef.current = restored
    setSaveState('saved')
  }

  function showFilter(next: 'all' | 'images' | 'trash') {
    setFilter(next)
    const current = draftRef.current
    if (next === 'trash') {
      if (!current?.deletedAt) void openRemaining(trash)
    } else if (current?.deletedAt) {
      void openRemaining(notes)
    }
  }

  async function deleteForever() {
    const current = draftRef.current
    if (!current) return
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    draftRef.current = null
    await library.remove(current.id)
    const remaining = trash.filter((item) => item.id !== current.id)
    setTrash(remaining)
    await openRemaining(remaining)
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const command = event.metaKey || event.ctrlKey
      if (!command) return
      const key = event.key.toLowerCase()
      if (key === 'n') {
        event.preventDefault()
        void createNote()
      } else if (key === 's') {
        event.preventDefault()
        void flush()
      } else if (key === '\\') {
        event.preventDefault()
        setFocusMode((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [createNote, flush])

  if (!ready) {
    return (
      <div className="boot">
        <span className="brand">
          <i className="mark" aria-hidden="true" />
          Folio
        </span>
      </div>
    )
  }

  return (
    <div className={focusMode ? 'app is-focus' : 'app'}>
      <div className="workspace">
        <Rail
          notes={notes}
          filter={filter}
          query={query}
          location={location}
          trashCount={trash.length}
          light={theme === 'light'}
          onFilter={showFilter}
          onQuery={setQuery}
          onReveal={() => {
            void library.reveal()
          }}
          onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        />
        <Sidebar
          notes={filter === 'trash' ? trash : notes}
          activeId={activeId}
          query={query}
          filter={filter}
          shortcut={shortcut}
          onOpen={(id) => {
            void openNote(id)
          }}
          onCreate={() => {
            void createNote()
          }}
        />
        <main className={draft ? 'stage' : 'stage bare'}>
          {draft ? (
            <Editor
              key={draft.id}
              note={draft}
              saveState={saveState}
              focusMode={focusMode}
              titleRef={titleRef}
              onChange={applyDraft}
              onDelete={() => {
                void (draft?.deletedAt ? deleteForever() : moveToTrash())
              }}
              onRestore={() => {
                void restoreNote()
              }}
              onToggleFocus={() => setFocusMode((value) => !value)}
            />
          ) : (
            <div className="empty">
              <p className="empty-kicker">Folio</p>
              <h1>{filter === 'trash' ? 'Trash is empty.' : 'Nothing on the desk.'}</h1>
              <p>{filter === 'trash' ? 'Deleted notes stay here until you restore them.' : 'A new note stays on this computer.'}</p>
              {filter !== 'trash' && (
                <button className="new-note solitary" onClick={() => void createNote()}>
                  New note
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
