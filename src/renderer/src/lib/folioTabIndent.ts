import type { Editor } from '@tiptap/core'
import { Extension } from '@tiptap/core'

const INDENT_PX = 24
const MAX_INDENT = 12

const INDENTABLE = ['paragraph', 'heading', 'listItem', 'taskItem'] as const
const ROW_INDENT_NODES = ['listItem', 'taskItem'] as const

function paragraphIndentAtCursor(editor: Editor): number {
  if (!editor.isActive('paragraph')) return 0
  return (editor.getAttributes('paragraph').indent as number) ?? 0
}

function transferParagraphIndentAfterToggle(
  editor: Editor,
  rowType: 'listItem' | 'taskItem',
  toggle: () => void
) {
  const paragraphIndent = paragraphIndentAtCursor(editor)
  toggle()
  if (paragraphIndent > 0 && editor.isActive(rowType)) {
    editor
      .chain()
      .focus()
      .updateAttributes(rowType, { indent: paragraphIndent })
      .updateAttributes('paragraph', { indent: 0 })
      .run()
  }
}

/** Tab-indented plain lines keep that offset when turned into a checkbox row. */
export function toggleTaskListPreservingIndent(editor: Editor) {
  transferParagraphIndentAfterToggle(editor, 'taskItem', () => {
    editor.chain().focus().toggleTaskList().run()
  })
}

export function toggleBulletListPreservingIndent(editor: Editor) {
  transferParagraphIndentAfterToggle(editor, 'listItem', () => {
    editor.chain().focus().toggleBulletList().run()
  })
}

export function toggleOrderedListPreservingIndent(editor: Editor) {
  transferParagraphIndentAfterToggle(editor, 'listItem', () => {
    editor.chain().focus().toggleOrderedList().run()
  })
}

export const FolioTabIndent = Extension.create({
  name: 'folioTabIndent',
  priority: 1000,

  addGlobalAttributes() {
    return [
      {
        types: [...INDENTABLE],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const raw = element.getAttribute('data-indent')
              if (!raw) return 0
              const n = parseInt(raw, 10)
              return Number.isFinite(n) ? n : 0
            },
            renderHTML: (attributes) => {
              const level = attributes.indent as number
              if (!level) return {}
              return {
                'data-indent': String(level),
                style: `margin-left: ${level * INDENT_PX}px`
              }
            }
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      blockIndent:
        () =>
        ({ state, dispatch, tr }) => {
          const { selection } = state
          const { $from } = selection

          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth)
            if (!ROW_INDENT_NODES.includes(node.type.name as (typeof ROW_INDENT_NODES)[number])) {
              continue
            }
            const current = (node.attrs.indent as number) ?? 0
            if (current >= MAX_INDENT) return false
            if (dispatch) {
              tr.setNodeMarkup($from.before(depth), undefined, {
                ...node.attrs,
                indent: current + 1
              })
              dispatch(tr)
            }
            return true
          }

          let updated = false
          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (!INDENTABLE.includes(node.type.name as (typeof INDENTABLE)[number])) return
            if (ROW_INDENT_NODES.includes(node.type.name as (typeof ROW_INDENT_NODES)[number])) return
            const current = (node.attrs.indent as number) ?? 0
            if (current >= MAX_INDENT) return
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: current + 1 })
            }
            updated = true
          })

          if (updated && dispatch) dispatch(tr)
          return updated
        },

      blockOutdent:
        () =>
        ({ state, dispatch, tr }) => {
          const { selection } = state
          const { $from } = selection

          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth)
            if (!ROW_INDENT_NODES.includes(node.type.name as (typeof ROW_INDENT_NODES)[number])) {
              continue
            }
            const current = (node.attrs.indent as number) ?? 0
            if (current <= 0) return false
            if (dispatch) {
              tr.setNodeMarkup($from.before(depth), undefined, {
                ...node.attrs,
                indent: current - 1
              })
              dispatch(tr)
            }
            return true
          }

          let updated = false
          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (!INDENTABLE.includes(node.type.name as (typeof INDENTABLE)[number])) return
            if (ROW_INDENT_NODES.includes(node.type.name as (typeof ROW_INDENT_NODES)[number])) return
            const current = (node.attrs.indent as number) ?? 0
            if (current <= 0) return
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: current - 1 })
            }
            updated = true
          })

          if (updated && dispatch) dispatch(tr)
          return updated
        }
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { editor } = this
        if (editor.isActive('codeBlock')) {
          return false
        }

        if (editor.isActive('listItem') || editor.isActive('taskItem')) {
          return editor.commands.blockIndent()
        }

        const { state } = editor
        const { empty, $from } = state.selection

        if (!empty) {
          return editor.commands.blockIndent()
        }

        const block = $from.parent
        if (
          block.isTextblock &&
          $from.parentOffset > 0 &&
          $from.parentOffset < block.content.size
        ) {
          return editor.commands.insertContent('\t')
        }

        return editor.commands.blockIndent()
      },
      'Shift-Tab': () => {
        const { editor } = this
        if (editor.isActive('listItem') || editor.isActive('taskItem')) {
          return editor.commands.blockOutdent()
        }
        return editor.commands.blockOutdent()
      }
    }
  }
})
