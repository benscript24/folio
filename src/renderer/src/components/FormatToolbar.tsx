import type { Editor } from '@tiptap/core'
import { useEffect, useState } from 'react'
import {
  toggleBulletListPreservingIndent,
  toggleOrderedListPreservingIndent,
  toggleTaskListPreservingIndent
} from '../lib/folioTabIndent'

type Props = {
  editor: Editor | null
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36] as const
const DEFAULT_FONT_SIZE = 16

function parseFontSizePx(raw: string | undefined): number | null {
  if (!raw) return null
  const match = /^(\d+(?:\.\d+)?)(px)?$/.exec(raw.trim())
  if (!match) return null
  return Math.round(Number(match[1]))
}

function nearestSizeIndex(px: number): number {
  return FONT_SIZES.reduce((best, size, index) =>
    Math.abs(size - px) < Math.abs(FONT_SIZES[best] - px) ? index : best
  , 0)
}

function stepFontSize(editor: Editor, direction: 1 | -1) {
  const parsed = parseFontSizePx(editor.getAttributes('textStyle').fontSize as string | undefined)
  const current = parsed ?? DEFAULT_FONT_SIZE
  const nextIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, nearestSizeIndex(current) + direction))
  editor.chain().focus().setFontSize(`${FONT_SIZES[nextIndex]}px`).run()
}

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#e5484d' },
  { label: 'Orange', value: '#f76808' },
  { label: 'Blue', value: '#3e74ff' },
  { label: 'Green', value: '#30a46c' },
  { label: 'Purple', value: '#8e4ec6' }
] as const

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#fff3a3' },
  { label: 'Green', value: '#c8f5d3' },
  { label: 'Blue', value: '#cfe7ff' },
  { label: 'Pink', value: '#ffd5f0' },
  { label: 'Gray', value: '#e8e8ec' }
] as const

function Tool({
  active,
  label,
  ariaLabel,
  onClick,
  className
}: {
  active?: boolean
  label: string
  ariaLabel?: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={active ? `format-tool active ${className ?? ''}` : `format-tool ${className ?? ''}`}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
    >
      {label}
    </button>
  )
}

function Swatch({
  label,
  color,
  active,
  onClick
}: {
  label: string
  color: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={active ? 'format-swatch active' : 'format-swatch'}
      style={{ background: color || 'var(--card)' }}
      onClick={onClick}
      aria-label={label}
      title={label}
    />
  )
}

export function FormatToolbar({ editor }: Props) {
  const [, refresh] = useState(0)

  useEffect(() => {
    if (!editor) return
    const update = () => refresh((value) => value + 1)
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  if (!editor) return null

  const textColor = (editor.getAttributes('textStyle').color as string | undefined) ?? ''
  const highlightColor = (editor.getAttributes('highlight').color as string | undefined) ?? ''
  const fontSizePx = parseFontSizePx(editor.getAttributes('textStyle').fontSize as string | undefined)
  const sizeIndex = nearestSizeIndex(fontSizePx ?? DEFAULT_FONT_SIZE)
  const canShrink = sizeIndex > 0
  const canGrow = sizeIndex < FONT_SIZES.length - 1

  return (
    <div className="format-bar" role="toolbar" aria-label="Formatting">
      <Tool
        label="B"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <Tool
        label="I"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <Tool
        label="U"
        className="format-underline"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <span className="format-divider" aria-hidden="true" />
      <div className="format-size" role="group" aria-label="Font size">
        <button
          type="button"
          className="format-tool format-size-step"
          aria-label="Decrease font size"
          disabled={!canShrink}
          onClick={() => stepFontSize(editor, -1)}
        >
          A−
        </button>
        <select
          className="format-size-select"
          aria-label="Font size"
          value={fontSizePx ?? DEFAULT_FONT_SIZE}
          onChange={(event) => {
            const size = Number(event.target.value)
            if (size === DEFAULT_FONT_SIZE && !fontSizePx) editor.chain().focus().unsetFontSize().run()
            else editor.chain().focus().setFontSize(`${size}px`).run()
          }}
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="format-tool format-size-step grow"
          aria-label="Increase font size"
          disabled={!canGrow}
          onClick={() => stepFontSize(editor, 1)}
        >
          A+
        </button>
      </div>
      <span className="format-divider" aria-hidden="true" />
      <Tool
        label="H2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <Tool
        label="• List"
        active={editor.isActive('bulletList')}
        onClick={() => toggleBulletListPreservingIndent(editor)}
      />
      <Tool
        label="1. List"
        active={editor.isActive('orderedList')}
        onClick={() => toggleOrderedListPreservingIndent(editor)}
      />
      <Tool
        label="☑"
        ariaLabel="Checkbox list"
        active={editor.isActive('taskList')}
        onClick={() => toggleTaskListPreservingIndent(editor)}
      />
      <Tool
        label="Quote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <span className="format-divider" aria-hidden="true" />
      <div className="format-group" role="group" aria-label="Text color">
        <span className="format-group-label">A</span>
        {TEXT_COLORS.map((item) => (
          <Swatch
            key={item.label}
            label={`Text ${item.label}`}
            color={item.value || 'transparent'}
            active={item.value ? textColor === item.value : !textColor}
            onClick={() => {
              if (item.value) editor.chain().focus().setColor(item.value).run()
              else editor.chain().focus().unsetColor().run()
            }}
          />
        ))}
        <label className="format-color-input" title="Custom text color">
          <span className="sr">Custom text color</span>
          <input
            type="color"
            value={textColor && textColor.startsWith('#') ? textColor : '#2a2a30'}
            onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
          />
        </label>
      </div>
      <span className="format-divider" aria-hidden="true" />
      <div className="format-group" role="group" aria-label="Highlight">
        <span className="format-group-label format-marker">▮</span>
        {HIGHLIGHT_COLORS.map((item) => (
          <Swatch
            key={item.label}
            label={`Highlight ${item.label}`}
            color={item.value}
            active={editor.isActive('highlight', { color: item.value })}
            onClick={() => editor.chain().focus().toggleHighlight({ color: item.value }).run()}
          />
        ))}
        <Tool
          label="Clear"
          active={Boolean(highlightColor)}
          onClick={() => editor.chain().focus().unsetHighlight().run()}
        />
        <label className="format-color-input highlight" title="Custom highlight">
          <span className="sr">Custom highlight color</span>
          <input
            type="color"
            value={highlightColor && highlightColor.startsWith('#') ? highlightColor : '#fff3a3'}
            onChange={(event) => editor.chain().focus().setHighlight({ color: event.target.value }).run()}
          />
        </label>
      </div>
    </div>
  )
}
