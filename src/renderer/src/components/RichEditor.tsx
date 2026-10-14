import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { FontSize, TextStyle } from '@tiptap/extension-text-style'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Underline from '@tiptap/extension-underline'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { Note } from '../../../shared/note'
import { library } from '../lib/library'
import { FolioTabIndent } from '../lib/folioTabIndent'
import {
  applyBodyMarkdown,
  markdownForDisplay,
  markdownForStorage,
  noteBodyMarkdown
} from '../lib/noteBody'
import { FormatToolbar } from './FormatToolbar'

export type RichEditorHandle = {
  insertImages: (files: File[]) => void
}

type Props = {
  note: Note
  readOnly?: boolean
  placeholder?: string
  onChange: (note: Note) => void
}

function filesFromList(list: FileList | File[]): File[] {
  return [...list].filter((file) => file.type.startsWith('image/'))
}

export const RichEditor = forwardRef<RichEditorHandle, Props>(function RichEditor(
  { note, readOnly = false, placeholder = 'Write…', onChange },
  ref
) {
  const noteRef = useRef(note)
  noteRef.current = note
  const displayMapRef = useRef(new Map<string, string>())
  const hydratingRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      FolioTabIndent,
      TextStyle,
      FontSize,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({
        allowBase64: true,
        resize: {
          enabled: true,
          directions: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
          minWidth: 80,
          minHeight: 80,
          alwaysPreserveAspectRatio: true
        }
      }),
      Placeholder.configure({ placeholder }),
      Markdown
    ],
    content: '',
    contentType: 'markdown',
    immediatelyRender: false,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose-mirror',
        spellcheck: 'true'
      }
    },
    onUpdate: ({ editor: current }) => {
      if (hydratingRef.current) return
      const raw = current.getMarkdown()
      const body = markdownForStorage(raw, displayMapRef.current)
      onChangeRef.current(applyBodyMarkdown(noteRef.current, body))
    }
  })

  useEffect(() => {
    if (!editor) return
    let live = true
    hydratingRef.current = true

    void (async () => {
      const body = noteBodyMarkdown(note)
      const { markdown, displayToStored } = await markdownForDisplay(note.id, body, (id, src) =>
        library.imageUrl(id, src)
      )
      if (!live) return
      displayMapRef.current = displayToStored
      editor.commands.setContent(markdown || '', { contentType: 'markdown', emitUpdate: false })
      hydratingRef.current = false
    })()

    return () => {
      live = false
    }
  }, [editor, note.id])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!readOnly)
  }, [editor, readOnly])

  useImperativeHandle(ref, () => ({
    insertImages: (files: File[]) => {
      void insertImages(files)
    }
  }))

  async function insertImages(files: File[]) {
    if (!editor || files.length === 0) return
    for (const file of files) {
      const stored = await library.saveImage(noteRef.current.id, file)
      const display = await library.imageUrl(noteRef.current.id, stored)
      displayMapRef.current.set(display, stored)
      const name = file.name || 'Image'
      editor
        .chain()
        .focus()
        .setImage({ src: display, alt: name, title: name })
        .run()
    }
  }

  return (
    <div
      className="rich-editor"
      onPaste={(event) => {
        const files = filesFromList(event.clipboardData.files)
        if (files.length === 0) return
        event.preventDefault()
        void insertImages(files)
      }}
      onDrop={(event) => {
        const files = filesFromList(event.dataTransfer.files)
        if (files.length === 0) return
        event.preventDefault()
        void insertImages(files)
      }}
    >
      {!readOnly && <FormatToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
})
