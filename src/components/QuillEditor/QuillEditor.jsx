import React, { useEffect, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "./QuillEditor.css";

export const QuillEditor = ({
  content,
  onChange,
  remoteTrigger,
  sheetId,
  readOnly = false,
}) => {
  const quillRef = useRef(null);
  const lastTriggerRef = useRef(remoteTrigger);
  const lastSheetIdRef = useRef(sheetId);

  // 1. Handle sheet changes (initial load of a sheet)
  useEffect(() => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();

    // Set initial content and update refs
    editor.root.innerHTML = content || "";
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

  // 3. Attach delegated click listener for copying code blocks
  useEffect(() => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();
    const root = editor.root;

    const handleRootClick = async (e) => {
      const codeBlock = e.target.closest('pre.ql-syntax, pre, code');
      if (codeBlock && root.contains(codeBlock)) {
        const textToCopy = codeBlock.textContent || codeBlock.innerText || "";
        if (!textToCopy) return;

        try {
          await navigator.clipboard.writeText(textToCopy);

          // Add temporary visual flash class
          codeBlock.classList.add('copied-flash');
          setTimeout(() => {
            codeBlock.classList.remove('copied-flash');
          }, 600);

          // Render floating copy tooltip
          const tooltip = document.createElement('div');
          tooltip.className = 'copied-tooltip';
          tooltip.innerText = 'Copied!';
          tooltip.style.left = `${e.clientX + window.scrollX}px`;
          tooltip.style.top = `${e.clientY + window.scrollY - 24}px`;
          document.body.appendChild(tooltip);

          setTimeout(() => {
            tooltip.classList.add('fade-out');
            setTimeout(() => tooltip.remove(), 200);
          }, 800);
        } catch (err) {
          console.error("Failed to copy code text:", err);
        }
      }
    };

    root.addEventListener('click', handleRootClick);
    return () => {
      root.removeEventListener('click', handleRootClick);
    };
  }, [sheetId]);

  const handleTextChange = (value, delta, source) => {
    // Only trigger change events from user interactions to prevent infinite loop
    if (source === "user") {
      onChange(value);
    }
  };

  const modules = {
    toolbar: [
      ["bold", "italic", "underline", "code", "code-block"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["clean"],
    ],
  };

  const formats = [
    "bold",
    "italic",
    "underline",
    "list",
    "bullet",
    "code",
    "code-block",
  ];

  return (
    <div className={`quill-wrapper ${readOnly ? "read-only" : ""}`}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        onChange={handleTextChange}
        modules={modules}
        formats={formats}
        placeholder={readOnly ? "" : "Type your notes here..."}
        readOnly={readOnly}
      />
    </div>
  );
};
