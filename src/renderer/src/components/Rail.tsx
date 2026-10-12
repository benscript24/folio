import type { NoteSummary } from '../../../shared/note'
import { ImageIcon, NotesIcon, SearchIcon } from './Icons'

export type NoteFilter = 'all' | 'images'

type Props = {
  notes: NoteSummary[]
  filter: NoteFilter
  query: string
  location: string
  light: boolean
  onFilter: (filter: NoteFilter) => void
  onQuery: (value: string) => void
  onReveal: () => void
  onToggleTheme: () => void
}

export function Rail({ notes, filter, query, location, light, onFilter, onQuery, onReveal, onToggleTheme }: Props) {
  const imageCount = notes.filter((note) => note.imageCount > 0).length
  const local = location !== 'Browser preview'

  return (
    <aside className="rail">
      <div className="col-head">
        <span className="brand">
          <i className="mark" aria-hidden="true" />
          Folio
        </span>
      </div>
      <div className="rail-body">
        <label className="search">
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search notes"
            spellCheck={false}
          />
        </label>
        <nav className="nav" aria-label="Library">
          <button
            type="button"
            className={filter === 'all' ? 'nav-item active' : 'nav-item'}
            onClick={() => onFilter('all')}
          >
            <NotesIcon />
            <span>All notes</span>
            <em>{notes.length}</em>
          </button>
          <button
            type="button"
            className={filter === 'images' ? 'nav-item active' : 'nav-item'}
            onClick={() => onFilter('images')}
          >
            <ImageIcon />
            <span>With images</span>
            <em>{imageCount}</em>
          </button>
        </nav>
      </div>
      <div className="rail-foot">
      <button className="where" onClick={onReveal} title={location} disabled={!local}>
        <span>On this computer</span>
        <span className="where-path">{local ? 'Documents / Folio' : 'Browser preview'}</span>
      </button>
      <div className="theme-row">
        <span>{light ? 'Light on' : 'Light off'}</span>
        <button
          type="button"
          className={light ? 'switch on' : 'switch'}
          role="switch"
          aria-checked={light}
          aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
          onClick={onToggleTheme}
        >
          <i />
        </button>
      </div>
      </div>
    </aside>
  )
}
