type IconProps = { className?: string }

export function NotesIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 2.5h5.2L12.5 5.8V13a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5v-10A.5.5 0 0 1 4 2.5Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9 2.7V6h3.2M5.5 8.5h5M5.5 11h3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.25v11.5M2.25 8h11.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.4 10.4 13.5 13.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function ImageIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="6" cy="6.4" r="1" fill="currentColor" />
      <path d="M3.2 11.2 6.3 8.4l2 1.7 1.6-1.3 2.9 2.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function FocusIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 3.5h4.2M3 3.5v4.2M13 3.5H8.8M13 3.5v4.2M3 12.5h4.2M3 12.5V8.3M13 12.5H8.8M13 12.5V8.3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function LibraryIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 3.5h4.2v9H2.5zM9.3 3.5H13.5v9H9.3z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

export function RestoreIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.2 8.2A4.8 4.8 0 1 0 4.6 4.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M3 3.2v3.1h3.1" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 4.5h9M6.2 4.4V3.2h3.6v1.2M4.6 4.5l.5 8.2h5.8l.5-8.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
