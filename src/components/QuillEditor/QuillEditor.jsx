import React, { useState, useEffect, useRef } from "react";
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
  const [contextMenu, setContextMenu] = useState(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setContextMenu(null);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

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
      const codeBlock = e.target.closest("pre.ql-syntax, pre, code");
      if (codeBlock && root.contains(codeBlock)) {
        const textToCopy = codeBlock.textContent || codeBlock.innerText || "";
        if (!textToCopy) return;

        try {
          await navigator.clipboard.writeText(textToCopy);

          // Add temporary visual flash class
          codeBlock.classList.add("copied-flash");
          setTimeout(() => {
            codeBlock.classList.remove("copied-flash");
          }, 600);

          // Render floating copy tooltip
          const tooltip = document.createElement("div");
          tooltip.className = "copied-tooltip";
          tooltip.innerText = "Copied!";
          tooltip.style.left = `${e.clientX + window.scrollX}px`;
          tooltip.style.top = `${e.clientY + window.scrollY - 24}px`;
          document.body.appendChild(tooltip);

          setTimeout(() => {
            tooltip.classList.add("fade-out");
            setTimeout(() => tooltip.remove(), 200);
          }, 800);
        } catch (err) {
          console.error("Failed to copy code text:", err);
        }
      }
    };

    root.addEventListener("click", handleRootClick);
    return () => {
      root.removeEventListener("click", handleRootClick);
    };
  }, [sheetId]);

  // 4. Attach delegated contextmenu (right-click) listener for copying table cells and opening custom menu
  useEffect(() => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();
    const root = editor.root;

    const handleRootContextMenu = async (e) => {
      const cell = e.target.closest("td, th");
      if (cell && root.contains(cell)) {
        e.preventDefault(); // Prevent standard browser context menu

        if (readOnly) {
          // In read-only mode, copy the cell content to clipboard
          const textToCopy = cell.textContent || cell.innerText || "";
          if (textToCopy) {
            try {
              await navigator.clipboard.writeText(textToCopy);

              // Add temporary visual flash class
              cell.classList.add("copied-flash");
              setTimeout(() => {
                cell.classList.remove("copied-flash");
              }, 600);

              // Render floating copy tooltip
              const tooltip = document.createElement("div");
              tooltip.className = "copied-tooltip";
              tooltip.innerText = "Cell Copied!";
              tooltip.style.left = `${e.clientX + window.scrollX}px`;
              tooltip.style.top = `${e.clientY + window.scrollY - 24}px`;
              document.body.appendChild(tooltip);

              setTimeout(() => {
                tooltip.classList.add("fade-out");
                setTimeout(() => tooltip.remove(), 200);
              }, 800);
            } catch (err) {
              console.error("Failed to copy table cell text:", err);
            }
          }
        } else {
          // In edit mode, focus cell and open custom context menu
          try {
            const blot = editor.constructor.find(cell);
            if (blot) {
              editor.focus();
              const index = editor.getIndex(blot);
              editor.setSelection(index, 0);
            }
          } catch (err) {
            console.error("Failed to select cell blot:", err);
          }

          setContextMenu({ x: e.clientX, y: e.clientY });
        }
      }
    };

    root.addEventListener("contextmenu", handleRootContextMenu);
    return () => {
      root.removeEventListener("contextmenu", handleRootContextMenu);
    };
  }, [sheetId, readOnly]);

  const handleTableAction = (action) => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();
    const table = editor.getModule("table");
    if (!table) return;

    editor.focus();

    switch (action) {
      case "insertRowAbove":
        table.insertRowAbove();
        break;
      case "insertRowBelow":
        table.insertRowBelow();
        break;
      case "insertColumnLeft":
        table.insertColumnLeft();
        break;
      case "insertColumnRight":
        table.insertColumnRight();
        break;
      case "deleteRow":
        table.deleteRow();
        break;
      case "deleteColumn":
        table.deleteColumn();
        break;
      case "deleteTable":
        table.deleteTable();
        break;
      default:
        break;
    }

    setContextMenu(null);
  };

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
      ["table"],
      ["clean"],
    ],
    table: true,
  };

  const formats = [
    "bold",
    "italic",
    "underline",
    "list",
    "bullet",
    "code",
    "code-block",
    "table",
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
      {contextMenu && !readOnly && (
        <div
          className="quill-context-menu"
          style={{
            position: "fixed",
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()} // Prevent click propagation
        >
          <button onClick={() => handleTableAction("insertRowAbove")}>Insert Row Above</button>
          <button onClick={() => handleTableAction("insertRowBelow")}>Insert Row Below</button>
          <button onClick={() => handleTableAction("insertColumnLeft")}>Insert Column Left</button>
          <button onClick={() => handleTableAction("insertColumnRight")}>Insert Column Right</button>
          <div className="context-menu-divider" />
          <button onClick={() => handleTableAction("deleteRow")} style={{ color: "#ff4d4f" }}>Delete Row</button>
          <button onClick={() => handleTableAction("deleteColumn")} style={{ color: "#ff4d4f" }}>Delete Column</button>
          <button onClick={() => handleTableAction("deleteTable")} style={{ color: "#ff4d4f" }}>Delete Table</button>
        </div>
      )}
    </div>
  );
};
