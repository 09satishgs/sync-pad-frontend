import React from "react";
import { Zap } from "lucide-react";
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
        className="modal modal-archive-preview"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">{content.TITLE}</div>
        <div className="archive-preview-meta">
          {content.TITLE_LABEL} {previewArchivedSheet.title}
        </div>

        <div className="archive-preview-container">
          <div
            className={`ql-editor archive-preview-content ${previewArchivedSheet.loading ? "loading" : ""}`}
          >
            {previewArchivedSheet.loading
              ? "Loading content from disk archive..."
              : previewArchivedSheet.content}
          </div>
        </div>

        <p className="archive-preview-instruction">
          {content.INSTRUCTION}
        </p>

        <div className="modal-actions archive-preview-actions">
          <button
            type="button"
            className="btn btn-primary flex-center flex-gap-3"
            onClick={() => handleLoadArchivedToLive(previewArchivedSheet.id)}
          >
            <Zap size={14} /> Load into Live Workspace to Edit
          </button>
          <div className="flex-align flex-gap-3">
            <button
              type="button"
              className="btn btn-danger flex-1"
              onClick={() => handleDeleteArchivedSheet(previewArchivedSheet.id)}
            >
              Delete Archive
            </button>
            <button
              type="button"
              className="btn flex-1"
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
