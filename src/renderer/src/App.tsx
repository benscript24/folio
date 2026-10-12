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
  const [filter, setFilter] = useState<'all' | 'images'>('all')
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
      const [list, where] = await Promise.all([library.list(), library.location()])
      if (!live) return
      setNotes(list)
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

  async function deleteNote() {
    if (!draftRef.current) return
    const id = draftRef.current.id
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    draftRef.current = null
    await library.remove(id)
    const remaining = notes.filter((item) => item.id !== id)
    setNotes(remaining)
    if (remaining[0]) {
      const note = await library.read(remaining[0].id)
      setActiveId(note.id)
      setDraft(note)
      draftRef.current = note
    } else {
      setActiveId(null)
      setDraft(null)
    }
    setSaveState('saved')
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
          light={theme === 'light'}
          onFilter={setFilter}
          onQuery={setQuery}
          onReveal={() => {
            void library.reveal()
          }}
          onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        />
        <Sidebar
          notes={notes}
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
                void deleteNote()
              }}
              onToggleFocus={() => setFocusMode((value) => !value)}
            />
          ) : (
            <div className="empty">
              <p className="empty-kicker">Folio</p>
              <h1>Nothing on the desk.</h1>
              <p>A new note stays on this computer.</p>
              <button className="new-note solitary" onClick={() => void createNote()}>
                New note
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
