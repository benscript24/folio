import { useMemo } from 'react'
import type { NoteSummary } from '../../../shared/note'
import type { NoteFilter } from './Rail'
import { PlusIcon } from './Icons'

type Props = {
  notes: NoteSummary[]
  activeId: string | null
  query: string
  filter: NoteFilter
  shortcut: string
  onOpen: (id: string) => void
  onCreate: () => void
}

function startOfDay(time: number): number {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function formatWhen(time: number): string {
  return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupNotes(notes: NoteSummary[]): { label: string; notes: NoteSummary[] }[] {
  const today = startOfDay(Date.now())
  const groups = [
    { label: 'This week', notes: [] as NoteSummary[] },
    { label: 'Last week', notes: [] as NoteSummary[] },
    { label: 'Earlier', notes: [] as NoteSummary[] }
  ]
  for (const note of notes) {
    const age = Math.round((today - startOfDay(note.updatedAt)) / 86_400_000)
    if (age <= 6) groups[0].notes.push(note)
    else if (age <= 13) groups[1].notes.push(note)
    else groups[2].notes.push(note)
  }
  return groups.filter((group) => group.notes.length > 0)
}

export function Sidebar({ notes, activeId, query, filter, shortcut, onOpen, onCreate }: Props) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return notes.filter((note) => {
      if (filter === 'images' && note.imageCount === 0) return false
      if (!needle) return true
      return `${note.title} ${note.excerpt}`.toLowerCase().includes(needle)
    })
  }, [notes, query, filter])

  const groups = useMemo(() => groupNotes(filtered), [filtered])
  const heading = filter === 'images' ? 'With images' : 'All notes'

  return (
    <section className="index" aria-label="Notes">
      <div className="col-head">
        <h1>{heading}</h1>
      </div>
      <div className="index-tools">
        <button className="new-note" onClick={onCreate}>
          <PlusIcon />
          <span>New note</span>
          <kbd>{shortcut}</kbd>
        </button>
      </div>
      <div className="index-scroll" role="listbox" aria-label="Notes">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="group-label">{group.label}</h2>
            {group.notes.map((note) => (
              <button
                key={note.id}
                type="button"
                role="option"
                aria-selected={note.id === activeId}
                className={note.id === activeId ? 'note active' : 'note'}
                onClick={() => onOpen(note.id)}
              >
                <span className="note-when">{formatWhen(note.updatedAt)}</span>
                <span className="note-title">{note.title}</span>
                <span className="note-excerpt">{note.excerpt || 'Empty page'}</span>
                {note.imageCount > 0 && (
                  <span className="tags">
                    <span className="tag">Image</span>
                  </span>
                )}
              </button>
            ))}
          </section>
        ))}
        {filtered.length === 0 && <p className="empty-search">Nothing matches.</p>}
      </div>
    </section>
  )
}
