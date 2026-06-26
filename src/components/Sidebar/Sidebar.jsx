import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSidebar } from "./useSidebar";
import { HEADINGS } from "../../constants/headings";
import { API_BASE_URL } from "../../constants/config";
import "./Sidebar.css";

export const Sidebar = ({
  categories,
  savedSheets,
  archivedSheets = [],
  activeSheet,
  onCreateCategory,
  onSaveLiveSheet,
  onDeleteLiveSheet,
  onOpenSavedSheet,
  onOpenArchivedSheet,
  sidebarOpen,
  setSidebarOpen,
  activeTabId,
  workspaces = [],
  activeWorkspaceId,
  setActiveWorkspaceId,
  isMaintainer,
  setShowInviteModal,
  isAdmin,
  onCreateSheetInCategory,
  files = [],
  loadingFiles = false,
  uploadingFile = false,
  onUploadFile,
  onDeleteFile,
}) => {
  const { user, logout, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [driveExpanded, setDriveExpanded] = useState(true);
  const {
    newCatName,
    setNewCatName,
    showCatInput,
    setShowCatInput,
    expandedCats,
    toggleCategory,
    handleCreateCategorySubmit,
  } = useSidebar({ onCreateCategory });

  // Group saved sheets by category
  const sheetsByCat = {};
  const uncategorizedSheets = [];

  savedSheets.forEach((sheet) => {
    if (sheet.category_id) {
      if (!sheetsByCat[sheet.category_id]) {
        sheetsByCat[sheet.category_id] = [];
      }
      sheetsByCat[sheet.category_id].push(sheet);
    } else {
      uncategorizedSheets.push(sheet);
    }
  });

  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          {HEADINGS.APP_TITLE} <span>{HEADINGS.APP_VERSION}</span>
        </div>
        <button
          className="btn"
          style={{ display: "none", padding: "0 6px", height: "24px" }}
          onClick={() => setSidebarOpen(false)}
        >
          ✕
        </button>
      </div>

      {workspaces.length > 0 && (
        <div className="workspace-selector-container">
          <select
            className="select-type"
            value={activeWorkspaceId || ""}
            onChange={(e) => setActiveWorkspaceId(Number(e.target.value))}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                💼 {ws.name}
              </option>
            ))}
          </select>

          {isMaintainer && (
            <button
              className="btn"
              onClick={() => setShowInviteModal(true)}
              title="Invite members"
            >
              👥
            </button>
          )}
        </div>
      )}

      <div className="sidebar-content">
        {/* Active Live Sheet Status */}
        <div className="sidebar-section-title">
          {HEADINGS.SIDEBAR.WORKSPACE_TITLE}
        </div>
        {activeSheet ? (
          <div
            className={`sidebar-item ${activeTabId === "live" ? "active" : ""}`}
            onClick={() => onOpenSavedSheet({ id: "live" })}
          >
            <div className="sidebar-item-label">
              <span className="badge badge-live">Live</span>
              <span style={{ fontWeight: 500 }}>{activeSheet.title}</span>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "8px",
              color: "var(--text-muted)",
              fontSize: "12px",
            }}
          >
            {HEADINGS.SIDEBAR.NO_ACTIVE_SHEET}
          </div>
        )}

        {/* Live Workspace Actions */}
        <div style={{ display: "flex", gap: "4px", padding: "4px 8px" }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, fontSize: "11px", height: "28px" }}
            onClick={onSaveLiveSheet}
          >
            Save / Archive
          </button>
          <button
            className="btn btn-danger"
            style={{ fontSize: "11px", height: "28px" }}
            onClick={onDeleteLiveSheet}
            title="Delete and Reset Live Sheet"
          >
            Reset
          </button>
        </div>

        {/* Saved Folders / Categories */}
        <div
          className="sidebar-section-title"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{HEADINGS.SIDEBAR.SAVED_SHEETS_TITLE}</span>
          <button
            type="button"
            className="btn"
            style={{
              padding: "0 4px",
              height: "16px",
              fontSize: "10px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-muted)",
              lineHeight: "1",
            }}
            onClick={() => {
              const title = prompt("Create new sheet:");
              if (title && title.trim()) {
                onCreateSheetInCategory(title.trim(), null);
              }
            }}
            title="Create new sheet"
          >
            ➕
          </button>
        </div>

        {/* Create Category Trigger */}
        {showCatInput ? (
          <form
            onSubmit={handleCreateCategorySubmit}
            style={{ padding: "0 8px 8px 8px" }}
          >
            <input
              type="text"
              className="input-field"
              placeholder={HEADINGS.SIDEBAR.NEW_CAT_PLACEHOLDER}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              autoFocus
              style={{ height: "28px", fontSize: "12px", marginBottom: "4px" }}
            />
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, height: "24px", fontSize: "10px" }}
              >
                {HEADINGS.SIDEBAR.ADD_BTN}
              </button>
              <button
                type="button"
                className="btn"
                style={{ height: "24px", fontSize: "10px" }}
                onClick={() => setShowCatInput(false)}
              >
                {HEADINGS.SIDEBAR.CANCEL_BTN}
              </button>
            </div>
          </form>
        ) : (
          <button
            className="btn"
            style={{
              width: "calc(100% - 16px)",
              margin: "0 8px 8px 8px",
              height: "26px",
              fontSize: "11px",
              borderStyle: "dashed",
            }}
            onClick={() => setShowCatInput(true)}
          >
            {HEADINGS.SIDEBAR.NEW_CAT_BTN}
          </button>
        )}

        <div style={{ padding: "0 8px" }}>
          {/* Categories and their sheets */}
          {categories.map((cat) => {
            const isExpanded = !!expandedCats[cat.id];
            const catSheets = sheetsByCat[cat.id] || [];
            return (
              <div key={cat.id} className="category-folder">
                <div
                  className="category-header"
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    📁 {cat.name} ({catSheets.length})
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: "0 4px",
                        height: "16px",
                        fontSize: "10px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const title = prompt(
                          `Create new sheet inside "${cat.name}":`,
                        );
                        if (title && title.trim()) {
                          onCreateSheetInCategory(title.trim(), cat.id);
                        }
                      }}
                      title="Create new sheet in category"
                    >
                      ➕
                    </button>
                  </span>
                  <span>{isExpanded ? "▼" : "▶"}</span>
                </div>
                {isExpanded && (
                  <div className="category-sheets">
                    {catSheets.length === 0 ? (
                      <div
                        style={{
                          padding: "6px 8px",
                          color: "var(--text-muted)",
                          fontSize: "11px",
                        }}
                      >
                        {HEADINGS.SIDEBAR.EMPTY_FOLDER}
                      </div>
                    ) : (
                      catSheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          className={`sidebar-item ${
                            activeTabId === sheet.id ? "active" : ""
                          }`}
                          onClick={() => onOpenSavedSheet(sheet)}
                        >
                          <div className="sidebar-item-label">
                            <span>{sheet.title}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Uncategorized Sheets Folder */}
          <div className="category-folder">
            <div
              className="category-header"
              onClick={() => toggleCategory("uncat")}
            >
              <span>📁 Uncategorized ({uncategorizedSheets.length})</span>
              <span>{expandedCats["uncat"] ? "▼" : "▶"}</span>
            </div>
            {expandedCats["uncat"] && (
              <div className="category-sheets">
                {uncategorizedSheets.length === 0 ? (
                  <div
                    style={{
                      padding: "6px 8px",
                      color: "var(--text-muted)",
                      fontSize: "11px",
                    }}
                  >
                    {HEADINGS.SIDEBAR.EMPTY_FOLDER}
                  </div>
                ) : (
                  uncategorizedSheets.map((sheet) => (
                    <div
                      key={sheet.id}
                      className={`sidebar-item ${activeTabId === sheet.id ? "active" : ""}`}
                      onClick={() => onOpenSavedSheet(sheet)}
                    >
                      <div className="sidebar-item-label">
                        <span>{sheet.title}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Workspace Drive Collapsible Section */}
        <div
          className="sidebar-section-title"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={() => setDriveExpanded(!driveExpanded)}
        >
          <span>📁 {HEADINGS.SIDEBAR.FILES_TITLE}</span>
          <span>{driveExpanded ? "▼" : "▶"}</span>
        </div>

        {driveExpanded && (
          <div className="drive-container" style={{ padding: "0 8px 8px 8px" }}>
            {/* File Drag-and-Drop Area & Button */}
            <div
              className={`file-dropzone ${uploadingFile ? "uploading" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (uploadingFile) return;
                const file = e.dataTransfer.files[0];
                if (file) onUploadFile(file);
              }}
              onClick={() => {
                if (uploadingFile) return;
                const fileInput = document.getElementById("drive-file-input");
                if (fileInput) fileInput.click();
              }}
              style={{
                border: "1px dashed var(--border-color)",
                borderRadius: "4px",
                padding: "12px",
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: "rgba(255, 255, 255, 0.01)",
                fontSize: "11px",
                color: "var(--text-muted)",
                transition: "all 0.2s ease",
                marginBottom: "8px",
              }}
            >
              <input
                id="drive-file-input"
                type="file"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) onUploadFile(file);
                }}
              />
              {uploadingFile ? (
                <span>🔄 {HEADINGS.SIDEBAR.UPLOADING}</span>
              ) : (
                <span>📥 {HEADINGS.SIDEBAR.UPLOAD_DRAG_PROMPT}</span>
              )}
            </div>

            {/* Files List */}
            {loadingFiles ? (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  padding: "4px",
                }}
              >
                Loading files...
              </div>
            ) : files.length === 0 ? (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  padding: "4px",
                }}
              >
                {HEADINGS.SIDEBAR.NO_FILES}
              </div>
            ) : (
              <div
                className="drive-files-list"
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {files.map((file) => {
                  // Format file size cleanly
                  const sizeKB = (file.size_bytes / 1024).toFixed(1);
                  const displaySize =
                    sizeKB > 1024
                      ? `${(sizeKB / 1024).toFixed(1)} MB`
                      : `${sizeKB} KB`;

                  // Format date cleanly
                  const uploadDate = new Date(
                    file.created_at,
                  ).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={file.id}
                      className="drive-file-item"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 8px",
                        border: "1px solid var(--border-color)",
                        backgroundColor: "var(--bg-card)",
                        fontSize: "12px",
                        borderRadius: "2px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          overflow: "hidden",
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={file.original_name}
                        >
                          📄 {file.original_name}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {displaySize} • {file.uploader_username || "Unknown"}{" "}
                          • {uploadDate}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          type="button"
                          className="btn"
                          style={{
                            padding: "0 6px",
                            height: "22px",
                            fontSize: "10px",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            // Fetch file download stream
                            const downloadUrl = `${API_BASE_URL}/workspaces/${activeWorkspaceId}/files/${file.id}/download`;
                            window.open(downloadUrl, "_blank");
                          }}
                          title="Download file"
                        >
                          ⬇️
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{
                            padding: "0 6px",
                            height: "22px",
                            fontSize: "10px",
                            cursor: "pointer",
                          }}
                          onClick={() => onDeleteFile(file.id)}
                          title="Delete file"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Archived Sheets Section */}
        <div className="sidebar-section-title">
          {HEADINGS.SIDEBAR.ARCHIVED_SHEETS_TITLE}
        </div>
        <div style={{ padding: "0 8px" }}>
          {archivedSheets.length === 0 ? (
            <div
              style={{
                padding: "6px 8px",
                color: "var(--text-muted)",
                fontSize: "12px",
              }}
            >
              {HEADINGS.SIDEBAR.NO_ARCHIVED_SHEETS}
            </div>
          ) : (
            archivedSheets.map((sheet) => (
              <div
                key={sheet.id}
                className="sidebar-item"
                onClick={() => onOpenArchivedSheet(sheet)}
                style={{ opacity: 0.7 }}
              >
                <div className="sidebar-item-label">
                  <span>📦 {sheet.title}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isAdmin && (
        <div
          style={{
            padding: "0 8px 8px 8px",
            borderTop: "1px solid var(--border-color)",
            paddingTop: "8px",
          }}
        >
          <button
            className="btn"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              height: "32px",
              fontSize: "12px",
              cursor: "pointer",
            }}
            onClick={() => navigate("/admin")}
          >
            ⚙️ Admin Dashboard
          </button>
        </div>
      )}

      {/* User profile footer */}
      <div className="sidebar-footer">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "140px",
            }}
          >
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {HEADINGS.SIDEBAR.ACTIVE_USER}
              <button
                type="button"
                className="btn"
                style={{
                  padding: "0 4px",
                  height: "16px",
                  fontSize: "10px",
                  lineHeight: "1",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
                onClick={async () => {
                  try {
                    await refreshSession();
                    alert("Roles and session metadata refreshed successfully.");
                    window.location.reload();
                  } catch (err) {
                    alert("Session refresh failed: " + err.message);
                  }
                }}
                title="Sync/Refresh roles"
              >
                {HEADINGS.SIDEBAR.SYNC_ROLES_BTN}
              </button>
            </span>
            <div style={{ fontWeight: 600 }}>{user?.username}</div>
          </div>
          <button
            className="btn"
            style={{ fontSize: "11px", padding: "0 8px", height: "26px" }}
            onClick={logout}
          >
            {HEADINGS.SIDEBAR.LOGOUT_BTN}
          </button>
        </div>
      </div>
    </aside>
  );
};
