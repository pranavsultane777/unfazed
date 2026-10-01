import { EditorContent } from '@tiptap/react';

export default function NoteEditor({ editor }) {
  if (!editor) return <div className="editor">Loading editor...</div>;
  return (
    <div className="note-editor-shell">
      <div className="toolbar">
        <button type="button" onClick={() => editor.chain().focus().setParagraph().run()}>Paragraph</button>
        <button type="button" className={editor.isActive('bold') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
        <button type="button" className={editor.isActive('italic') ? 'active' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>☷</button>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo().run()}>↶</button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo().run()}>↷</button>
      </div>
      <div className="editor"><EditorContent editor={editor} /></div>
    </div>
  );
}
