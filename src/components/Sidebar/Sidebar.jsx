import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Users,
  Plus,
  Folder,
  FileText,
  Download,
  Trash2,
  Archive,
  Settings,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useSidebar } from "./useSidebar";
import { HEADINGS } from "../../constants/headings";
import { API_BASE_URL } from "../../constants/config";
import { customAlert, customPrompt } from "../CustomAlerts/CustomAlerts";
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

  const handleSync = async () => {
    try {
      await refreshSession();
      await customAlert("Roles and session metadata refreshed successfully.");
      window.location.reload();
    } catch (err) {
      await customAlert("Session refresh failed: " + err.message);
    }
  };

  const handleCreateSheet = async () => {
    const title = await customPrompt("Create new sheet:");
    if (title && title.trim()) {
      onCreateSheetInCategory(title.trim(), null);
    }
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          {HEADINGS.APP_TITLE} <span>{HEADINGS.APP_VERSION}</span>
        </div>
        <button
          className="btn sidebar-close-btn"
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
                {ws.name}
              </option>
            ))}
          </select>

          {isMaintainer && (
            <button
              className="btn flex-center"
              onClick={() => setShowInviteModal(true)}
              title="Invite members"
            >
              <Users size={14} />
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
              <span className="sheet-title-active">{activeSheet.title}</span>
            </div>
          </div>
        ) : (
          <div className="sidebar-empty-state">
            {HEADINGS.SIDEBAR.NO_ACTIVE_SHEET}
          </div>
        )}

        {/* Live Workspace Actions */}
        <div className="sidebar-actions-row">
          <button
            className="btn btn-primary sidebar-btn-save"
            onClick={onSaveLiveSheet}
          >
            Save / Archive
          </button>
          <button
            className="btn btn-danger sidebar-btn-reset"
            onClick={onDeleteLiveSheet}
            title="Delete and Reset Live Sheet"
          >
            Reset
          </button>
        </div>

        {/* Saved Folders / Categories */}
        <div className="sidebar-section-title sidebar-section-title-interactive">
          <span>{HEADINGS.SIDEBAR.SAVED_SHEETS_TITLE}</span>
          <button
            type="button"
            className="btn sidebar-header-btn"
            onClick={handleCreateSheet}
            title="Create new sheet"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Create Category Trigger */}
        {showCatInput ? (
          <form onSubmit={handleCreateCategorySubmit} className="category-form">
            <input
              type="text"
              className="input-field category-input"
              placeholder={HEADINGS.SIDEBAR.NEW_CAT_PLACEHOLDER}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              autoFocus
            />
            <div className="flex-align flex-gap-2">
              <button
                type="submit"
                className="btn btn-primary category-form-btn"
              >
                {HEADINGS.SIDEBAR.ADD_BTN}
              </button>
              <button
                type="button"
                className="btn category-form-btn"
                onClick={() => setShowCatInput(false)}
              >
                {HEADINGS.SIDEBAR.CANCEL_BTN}
              </button>
            </div>
          </form>
        ) : (
          <button
            className="btn category-trigger-btn"
            onClick={() => setShowCatInput(true)}
          >
            {HEADINGS.SIDEBAR.NEW_CAT_BTN}
          </button>
        )}

        <div className="sidebar-list-container">
          {/* Categories and their sheets */}
          {categories.map((cat) => {
            const isExpanded = !!expandedCats[cat.id];
            const catSheets = sheetsByCat[cat.id] || [];
            return (
              <div key={cat.id} className="category-folder">
                <div
                  className="category-header"
                  onClick={() => toggleCategory(cat.id)}
                >
                  <span className="flex-align flex-gap-3">
                    <Folder size={14} />
                    <span>
                      {cat.name} ({catSheets.length})
                    </span>
                    <button
                      type="button"
                      className="btn category-add-sheet-btn"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const title = await customPrompt(
                          `Create new sheet inside "${cat.name}":`,
                        );
                        if (title && title.trim()) {
                          onCreateSheetInCategory(title.trim(), cat.id);
                        }
                      }}
                      title="Create new sheet in category"
                    >
                      <Plus size={12} />
                    </button>
                  </span>
                  <span>{isExpanded ? "▼" : "▶"}</span>
                </div>
                {isExpanded && (
                  <div className="category-sheets">
                    {catSheets.length === 0 ? (
                      <div className="category-empty-text">
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
              <span className="flex-align flex-gap-3">
                <Folder size={14} />
                <span>Uncategorized ({uncategorizedSheets.length})</span>
              </span>
              <span>{expandedCats["uncat"] ? "▼" : "▶"}</span>
            </div>
            {expandedCats["uncat"] && (
              <div className="category-sheets">
                {uncategorizedSheets.length === 0 ? (
                  <div className="category-empty-text">
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
          className="sidebar-section-title sidebar-section-title-interactive"
          onClick={() => setDriveExpanded(!driveExpanded)}
        >
          <span className="flex-align flex-gap-3">
            <Folder size={14} />
            <span>{HEADINGS.SIDEBAR.FILES_TITLE}</span>
          </span>
          <span>{driveExpanded ? "▼" : "▶"}</span>
        </div>

        {driveExpanded && (
          <div className="drive-container drive-container-inner">
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
            >
              <input
                id="drive-file-input"
                type="file"
                className="sidebar-close-btn"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) onUploadFile(file);
                }}
              />
              {uploadingFile ? (
                <span className="flex-center flex-gap-3">
                  <RefreshCw size={14} className="spin-animation" />{" "}
                  {HEADINGS.SIDEBAR.UPLOADING}
                </span>
              ) : (
                <span className="flex-center flex-gap-3">
                  <Upload size={14} /> {HEADINGS.SIDEBAR.UPLOAD_DRAG_PROMPT}
                </span>
              )}
            </div>

            {/* Files List */}
            {loadingFiles ? (
              <div className="drive-empty-text">Loading files...</div>
            ) : files.length === 0 ? (
              <div className="drive-empty-text">
                {HEADINGS.SIDEBAR.NO_FILES}
              </div>
            ) : (
              <div className="drive-files-list flex-column flex-gap-2">
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
                    <div key={file.id} className="drive-file-item">
                      <div className="drive-file-info">
                        <div
                          className="drive-file-name"
                          title={file.original_name}
                        >
                          <FileText size={14} style={{ flexShrink: 0 }} />
                          {file.original_name}
                        </div>
                        <div className="drive-file-meta">
                          {displaySize} • {file.uploader_username || "Unknown"}{" "}
                          • {uploadDate}
                        </div>
                      </div>
                      <div className="flex-align flex-gap-2">
                        <button
                          type="button"
                          className="btn drive-file-btn"
                          onClick={() => {
                            // Fetch file download stream
                            const downloadUrl = `${API_BASE_URL}/workspaces/${activeWorkspaceId}/files/${file.id}/download`;
                            window.open(downloadUrl, "_blank");
                          }}
                          title="Download file"
                        >
                          <Download size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger drive-file-btn"
                          onClick={() => onDeleteFile(file.id)}
                          title="Delete file"
                        >
                          <Trash2 size={12} />
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
        <div className="sidebar-list-container">
          {archivedSheets.length === 0 ? (
            <div className="sidebar-empty-state">
              {HEADINGS.SIDEBAR.NO_ARCHIVED_SHEETS}
            </div>
          ) : (
            archivedSheets.map((sheet) => (
              <div
                key={sheet.id}
                className="sidebar-item archived-item-wrapper"
                onClick={() => onOpenArchivedSheet(sheet)}
              >
                <div className="sidebar-item-label flex-align flex-gap-3">
                  <Archive size={14} />
                  <span>{sheet.title}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="sidebar-admin-section">
          <button
            className="btn flex-center flex-gap-3 admin-sidebar-btn"
            onClick={() => navigate("/admin")}
          >
            <Settings size={14} /> Admin Dashboard
          </button>
        </div>
      )}

      {/* User profile footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <div className="sidebar-footer-user-info">
            <span className="sidebar-footer-user-label">
              {HEADINGS.SIDEBAR.ACTIVE_USER}
              <button
                type="button"
                className="btn sidebar-sync-btn"
                onClick={handleSync}
                title="Sync/Refresh roles"
              >
                <RefreshCw size={12} />
              </button>
            </span>
            <div className="sidebar-footer-username">{user?.username}</div>
          </div>
          <button className="btn sidebar-footer-logout-btn" onClick={logout}>
            {HEADINGS.SIDEBAR.LOGOUT_BTN}
          </button>
        </div>
      </div>
    </aside>
  );
};
