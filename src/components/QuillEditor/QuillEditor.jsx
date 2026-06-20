import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './QuillEditor.css';

export const QuillEditor = ({ content, onChange, remoteTrigger, sheetId, readOnly = false }) => {
  const quillRef = useRef(null);
  const lastTriggerRef = useRef(remoteTrigger);
  const lastSheetIdRef = useRef(sheetId);

  // 1. Handle sheet changes (initial load of a sheet)
  useEffect(() => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();

    // Set initial content and update refs
    editor.root.innerHTML = content || '';
    lastSheetIdRef.current = sheetId;
    lastTriggerRef.current = remoteTrigger;
  }, [sheetId]);

  // 2. Handle remote socket updates
  useEffect(() => {
    if (!quillRef.current) return;

    const isRemote = lastTriggerRef.current !== remoteTrigger;
    lastTriggerRef.current = remoteTrigger;

    if (isRemote) {
      const editor = quillRef.current.getEditor();
      const currentHtml = editor.root.innerHTML;

      if (content !== currentHtml && content !== undefined) {
        const selection = editor.getSelection();

        // Temporarily disable text-change listener during programmatic updates if needed,
        // but since handleTextChange checks source === 'user', it's already safe.
        editor.root.innerHTML = content;

        if (selection && editor.hasFocus()) {
          editor.setSelection(selection.index, selection.length);
        }
      }
    }
  }, [remoteTrigger, content]);

  const handleTextChange = (value, delta, source) => {
    // Only trigger change events from user interactions to prevent infinite loop
    if (source === 'user') {
      onChange(value);
    }
  };

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean'],
    ],
  };

  const formats = ['bold', 'italic', 'underline', 'list', 'bullet', 'code-block'];

  return (
    <div className={`quill-wrapper ${readOnly ? 'read-only' : ''}`}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        onChange={handleTextChange}
        modules={modules}
        formats={formats}
        placeholder={readOnly ? 'Viewing read-only live clipboard...' : 'Type your notes here...'}
        readOnly={readOnly}
      />
    </div>
  );
};
