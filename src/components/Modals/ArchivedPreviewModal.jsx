import React from "react";
import { HEADINGS } from "../../constants/headings";
import "./Modals.css";

export const ArchivedPreviewModal = ({
  previewArchivedSheet,
  setPreviewArchivedSheet,
  handleLoadArchivedToLive,
  handleDeleteArchivedSheet,
}) => {
  if (!previewArchivedSheet) return null;

  const content = HEADINGS.MODALS.ARCHIVE;

  console.log("previewArchivedSheet", previewArchivedSheet);
  return (
    <div
      className="modal-overlay"
      onClick={() => setPreviewArchivedSheet(null)}
    >
      <div
        className="modal"
        style={{ width: "500px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">{content.TITLE}</div>
        <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px" }}>
          {content.TITLE_LABEL} {previewArchivedSheet.title}
        </div>

        <div
          style={{
            width: "100%",
            border: "1px solid var(--border-color)",
            borderRadius: "2px",
            backgroundColor: "var(--bg-color)",
            overflow: "hidden",
          }}
        >
          <div
            className="ql-editor"
            style={{
              width: "100%",
              height: "220px",
              overflowY: "auto",
              padding: "12px",
              background: "var(--bg-color)",
              display: previewArchivedSheet.loading ? "flex" : "block",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            {previewArchivedSheet.loading
              ? "Loading content from disk archive..."
              : previewArchivedSheet.content}
          </div>
        </div>

        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            marginTop: "4px",
          }}
        >
          {content.INSTRUCTION}
        </p>

        <div
          className="modal-actions"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            marginTop: "12px",
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleLoadArchivedToLive(previewArchivedSheet.id)}
          >
            ⚡ Load into Live Workspace to Edit
          </button>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={() => handleDeleteArchivedSheet(previewArchivedSheet.id)}
            >
              Delete Archive
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              onClick={() => setPreviewArchivedSheet(null)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ArchivedPreviewModal;
