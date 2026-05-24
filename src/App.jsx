import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { SocketProvider, useSocket } from "./hooks/useSocket";
import { Sidebar } from "./components/Sidebar";
import { QuillEditor } from "./components/QuillEditor";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// LCS-based line-by-line diff calculator
function computeDiff(oldStr, newStr) {
  const oldLines = (oldStr || "").split("\n");
  const newLines = (newStr || "").split("\n");

  const dp = Array(oldLines.length + 1)
    .fill()
    .map(() => Array(newLines.length + 1).fill(0));
  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = oldLines.length;
  let j = newLines.length;
  const diff = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.unshift({ type: "common", value: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: "added", value: newLines[j - 1] });
      j--;
    } else {
      diff.unshift({ type: "removed", value: oldLines[i - 1] });
      i--;
    }
  }
  return diff;
}

// Loose JS Object key-value quoting formatter
const makeValidJsonString = (str) => {
  if (!str.trim()) return "";
  let clean = str;

  // 1. Replace single-quoted keys: 'key': -> "key":
  clean = clean.replace(/([{,\s])'([a-zA-Z0-9_$]+)'\s*:/g, '$1"$2":');

  // 2. Quote unquoted keys: key: -> "key":
  clean = clean.replace(/([{,\s])([a-zA-Z0-9_$]+)\s*:/g, (match, p1, p2) => {
    if (p2 === "true" || p2 === "false" || p2 === "null") {
      return match;
    }
    return p1 + '"' + p2 + '":';
  });

  // 3. Replace single-quoted string values: 'value' -> "value"
  clean = clean.replace(/:\s*'([^']*)'/g, ': "$1"');
  clean = clean.replace(/,\s*'([^']*)'/g, ', "$1"');
  clean = clean.replace(/\[\s*'([^']*)'/g, '[ "$1"');
  clean = clean.replace(/,\s*'([^']*)'/g, ', "$1"'); // Second pass

  return clean;
};

function Dashboard() {
  const { user } = useAuth();
  const socket = useSocket();

  // Core Data States
  const [activeSheet, setActiveSheet] = useState(null);
  const [categories, setCategories] = useState([]);
  const [savedSheets, setSavedSheets] = useState([]);
  const [archivedSheets, setArchivedSheets] = useState([]);

  // Parallel Workspace Tabs States
  const [openTabs, setOpenTabs] = useState([]); // [{ id, title, content, originalContent, category_id, loadedAt, isDirty }]
  const [activeTabId, setActiveTabId] = useState("live"); // 'live' or saved sheet id (number)

  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveCatId, setSaveCatId] = useState("");
  const [saveType, setSaveType] = useState("saved"); // 'saved' vs 'archived'
  const [countdownText, setCountdownText] = useState("");

  // Conflict Resolution States
  const [conflictData, setConflictData] = useState(null); // { sheetId, title, clientContent, serverContent, loadedAt, serverUpdatedAt }

  // Archived Preview Modal States
  const [previewArchivedSheet, setPreviewArchivedSheet] = useState(null); // { id, title, content }

  // Collaborative input autofocus fixer state
  const [remoteTrigger, setRemoteTrigger] = useState(0);

  // Refs for debouncing WebSocket transmissions
  const transmitTimeoutRef = useRef(null);

  // Load Initial Workspace Data
  const loadWorkspace = async () => {
    try {
      const [liveRes, catRes, savedRes, archivedRes] = await Promise.all([
        axios.get("/sheets/live"),
        axios.get("/sheets/categories"),
        axios.get("/sheets/saved"),
        axios.get("/sheets/archived"),
      ]);
      setActiveSheet(liveRes.data);
      setCategories(catRes.data);
      setSavedSheets(savedRes.data);
      setArchivedSheets(archivedRes.data);
    } catch (err) {
      console.error("Failed to load workspace data:", err);
      addToast("Failed to load workspace data.", "error");
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  // Update remaining expiration time countdown for Live Sheet
  useEffect(() => {
    if (!activeSheet || !activeSheet.expires_at) {
      setCountdownText("");
      return;
    }

    const updateCountdown = () => {
      const expiresTime = new Date(activeSheet.expires_at).getTime();
      const diffMs = expiresTime - Date.now();

      if (diffMs <= 0) {
        setCountdownText("Archiving...");
        return;
      }

      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      setCountdownText(`${hours}h ${mins}m remaining`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 10000); // Update every 10 seconds
    return () => clearInterval(timer);
  }, [activeSheet]);

  // WebSocket Event Listeners
  useEffect(() => {
    if (!socket || !activeSheet) return;

    // Notify the server which sheet we are viewing (if currently on the Live Sheet)
    if (activeTabId === "live") {
      socket.emit("client_viewing_sheet", { sheetId: activeSheet.id });
    }

    // Listen for live updates on the viewing sheet
    socket.on("server_sheet_content_updated", (data) => {
      if (data.sheetId === activeSheet.id) {
        // Direct state update bypasses typing handler trigger loop
        setActiveSheet((prev) => ({
          ...prev,
          content: data.content,
        }));
        setRemoteTrigger((prev) => prev + 1);
      }
    });

    // Listen for sheet updates on OTHER sheets
    socket.on("server_sheet_background_updated", (data) => {
      addToast(`Sheet "${data.title}" updated from another device.`, "info");
    });

    // Listen for auto-archive triggers
    socket.on("live_sheet_archived", (data) => {
      addToast(data.message, "warning");
      setActiveSheet(data.newLiveSheet);
      setRemoteTrigger((prev) => prev + 1);
      axios.get("/sheets/archived").then((res) => setArchivedSheets(res.data));
    });

    // Listen for general lists update signals (saved sheets, categories created/deleted)
    socket.on("sheets_list_updated", () => {
      axios.get("/sheets/saved").then((res) => setSavedSheets(res.data));
      axios.get("/sheets/archived").then((res) => setArchivedSheets(res.data));
      axios.get("/sheets/categories").then((res) => setCategories(res.data));
    });

    return () => {
      socket.off("server_sheet_content_updated");
      socket.off("server_sheet_background_updated");
      socket.off("live_sheet_archived");
      socket.off("sheets_list_updated");
    };
  }, [socket, activeSheet?.id, activeTabId]);

  // Toast System Helpers
  const addToast = (message, type = "info") => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Local typing modification handler
  const handleContentChange = (newContent) => {
    if (activeTabId === "live") {
      if (!activeSheet) return;

      // 1. Snappily update local view state immediately
      setActiveSheet((prev) => ({
        ...prev,
        content: newContent,
      }));

      // 2. Clear old timeout
      if (transmitTimeoutRef.current) {
        clearTimeout(transmitTimeoutRef.current);
      }

      // 3. Debounce WebSocket transmission to server (300ms)
      transmitTimeoutRef.current = setTimeout(() => {
        if (socket) {
          socket.emit("client_edit_sheet", {
            sheetId: activeSheet.id,
            content: newContent,
          });
        }
      }, 300);
    } else {
      // Edits on a saved sheet (un-synchronized, client-side only till saved manually)
      setOpenTabs((prev) =>
        prev.map((t) => {
          if (t.id === activeTabId) {
            return {
              ...t,
              content: newContent,
              isDirty: newContent !== t.originalContent,
            };
          }
          return t;
        }),
      );
    }
  };

  // Clean and Format document contents as JSON
  const handleFormatJson = () => {
    const content =
      activeTabId === "live" ? activeSheet?.content : activeSavedTab?.content;
    if (!content) {
      addToast("No content to format.", "warning");
      return;
    }

    // Convert HTML blocks/paragraphs to plain text
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";

    // Replace all non-breaking spaces with standard spaces to avoid JSON parsing issues
    const cleanText = plainText.replace(/\u00a0/g, " ");

    try {
      const cleaned = makeValidJsonString(cleanText);
      const parsed = JSON.parse(cleaned);
      const formattedJson = JSON.stringify(parsed, null, 2);

      // Format as paragraph blocks with spaces replaced by &nbsp; to prevent collapsing
      const htmlValue = formattedJson
        .split("\n")
        .map((line) => {
          const escaped = line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/ /g, "&nbsp;");
          return `<p>${escaped || "<br>"}</p>`;
        })
        .join("");

      handleContentChange(htmlValue);
      setRemoteTrigger((prev) => prev + 1); // Reset local editor innerHTML DOM values
      addToast("JSON formatted successfully.", "success");
    } catch (err) {
      addToast(`Invalid JSON: ${err.message}`, "error");
    }
  };

  // Create Category Request
  const handleCreateCategory = async (name) => {
    try {
      await axios.post("/sheets/categories", { name });
      if (socket) socket.emit("client_sheets_list_modified");
      addToast(`Category "${name}" created.`, "success");
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to create category",
        "error",
      );
    }
  };

  // Save/Archive live sheet from modal
  const handleSaveLiveSheet = async (e) => {
    e.preventDefault();
    if (!saveTitle.trim()) return;

    try {
      const endpoint =
        saveType === "archived" ? "/sheets/archive-live" : "/sheets/save-live";
      const res = await axios.post(endpoint, {
        title: saveTitle.trim(),
        category_id: saveCatId === "" ? null : Number(saveCatId),
      });

      // Load new live sheet and close modal
      setActiveSheet(res.data.newLiveSheet);
      setShowSaveModal(false);
      setSaveTitle("");
      setSaveCatId("");

      // Reload lists
      const [savedRes, archivedRes] = await Promise.all([
        axios.get("/sheets/saved"),
        axios.get("/sheets/archived"),
      ]);
      setSavedSheets(savedRes.data);
      setArchivedSheets(archivedRes.data);

      // Emit list update to other devices
      if (socket) socket.emit("client_sheets_list_modified");
      addToast(
        saveType === "archived"
          ? "Live sheet auto-archived. Fresh sheet started."
          : "Live sheet saved as editable. Fresh sheet started.",
        "success",
      );
    } catch (err) {
      addToast("Failed to save live sheet.", "error");
    }
  };

  // Reset live sheet (delete current live and make a fresh blank one)
  const handleDeleteLiveSheet = async () => {
    if (
      !confirm(
        "Are you sure you want to discard your current live sheet? All unsaved edits will be lost.",
      )
    ) {
      return;
    }

    try {
      const res = await axios.post("/sheets/delete-live");
      setActiveSheet(res.data.newLiveSheet);
      if (socket) socket.emit("client_sheets_list_modified");
      addToast("Live sheet has been reset.", "info");
    } catch (err) {
      addToast("Failed to reset sheet.", "error");
    }
  };

  // Tabs workspace handlers
  const handleOpenSavedSheet = (sheet) => {
    if (sheet.id === "live") {
      setActiveTabId("live");
      setSidebarOpen(false);
      return;
    }

    // Check if tab is already open
    if (openTabs.some((t) => t.id === sheet.id)) {
      setActiveTabId(sheet.id);
    } else {
      // Add a new tab
      const newTab = {
        id: sheet.id,
        title: sheet.title,
        content: sheet.content || "",
        originalContent: sheet.content || "",
        category_id: sheet.category_id || null,
        loadedAt: sheet.updated_at,
        isDirty: false,
      };
      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabId(sheet.id);
    }
    setSidebarOpen(false);
  };

  const handleCloseTab = (tabId, e) => {
    if (e) e.stopPropagation();
    const tab = openTabs.find((t) => t.id === tabId);
    if (tab && tab.isDirty) {
      if (!confirm(`Discard unsaved changes to "${tab.title}"?`)) {
        return;
      }
    }
    setOpenTabs((prev) => prev.filter((t) => t.id !== tabId));
    if (activeTabId === tabId) {
      setActiveTabId("live");
    }
  };

  // Save saved sheet edits manually
  const handleSaveSavedSheet = async (tabId, force = false) => {
    const tab = openTabs.find((t) => t.id === tabId);
    if (!tab) return;

    try {
      const res = await axios.put(`/sheets/saved/${tabId}`, {
        title: tab.title,
        content: tab.content,
        category_id: tab.category_id,
        loadedAt: tab.loadedAt,
        force,
      });

      // Update tab settings to match new DB values
      setOpenTabs((prev) =>
        prev.map((t) => {
          if (t.id === tabId) {
            return {
              ...t,
              title: res.data.title,
              originalContent: res.data.content,
              loadedAt: res.data.updated_at,
              category_id: res.data.category_id,
              isDirty: false,
            };
          }
          return t;
        }),
      );

      // Refresh saved sheets lists
      const savedRes = await axios.get("/sheets/saved");
      setSavedSheets(savedRes.data);

      if (socket) socket.emit("client_sheets_list_modified");
      setConflictData(null);
      addToast(`Changes to "${tab.title}" saved successfully.`, "success");
    } catch (err) {
      if (err.response?.status === 409) {
        // Concurrency conflict!
        setConflictData({
          sheetId: tabId,
          title: tab.title,
          clientContent: tab.content,
          serverContent: err.response.data.serverContent,
          loadedAt: tab.loadedAt,
          serverUpdatedAt: err.response.data.serverUpdatedAt,
        });
      } else {
        addToast(
          err.response?.data?.message || "Failed to save changes.",
          "error",
        );
      }
    }
  };

  // Fetch the latest sheet version from DB and reload tab if un-edited
  const handleRefreshSavedSheet = async (tabId) => {
    try {
      const res = await axios.get("/sheets/saved");
      const latestSheet = res.data.find((s) => s.id === tabId);

      if (latestSheet) {
        setOpenTabs((prev) =>
          prev.map((t) => {
            if (t.id === tabId) {
              return {
                ...t,
                title: latestSheet.title,
                content: latestSheet.content || "",
                originalContent: latestSheet.content || "",
                loadedAt: latestSheet.updated_at,
                category_id: latestSheet.category_id,
                isDirty: false,
              };
            }
            return t;
          }),
        );

        setSavedSheets(res.data);
        setRemoteTrigger((prev) => prev + 1); // Trigger DOM editor updates
        addToast(
          `Sheet "${latestSheet.title}" reloaded with latest server content.`,
          "success",
        );
      } else {
        addToast("This sheet no longer exists on the server.", "error");
      }
    } catch (err) {
      addToast("Failed to refresh sheet content.", "error");
    }
  };

  // Delete saved sheet directly from tab controls
  const handleDeleteSavedSheetFromTab = async (sheetId) => {
    if (
      !confirm("Are you sure you want to delete this saved sheet permanently?")
    ) {
      return;
    }
    try {
      await axios.delete(`/sheets/saved/${sheetId}`);
      setOpenTabs((prev) => prev.filter((t) => t.id !== sheetId));
      setActiveTabId("live");

      const savedRes = await axios.get("/sheets/saved");
      setSavedSheets(savedRes.data);

      if (socket) socket.emit("client_sheets_list_modified");
      addToast("Sheet deleted.", "info");
    } catch (err) {
      addToast("Failed to delete sheet.", "error");
    }
  };

  // Tab values properties update
  const handleTabPropertiesChange = (tabId, field, val) => {
    setOpenTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            [field]: val,
            isDirty: true,
          };
        }
        return t;
      }),
    );
  };

  // Concurrency resolutions
  const handleResolveKeepServer = () => {
    if (!conflictData) return;
    const { sheetId, serverContent, serverUpdatedAt } = conflictData;

    setOpenTabs((prev) =>
      prev.map((t) => {
        if (t.id === sheetId) {
          return {
            ...t,
            content: serverContent,
            originalContent: serverContent,
            loadedAt: serverUpdatedAt,
            isDirty: false,
          };
        }
        return t;
      }),
    );
    setConflictData(null);
    setRemoteTrigger((prev) => prev + 1); // Reset local editor view
    addToast("Discarded local changes and pulled server edits.", "info");
  };

  const handleResolveCombine = () => {
    if (!conflictData) return;
    const { sheetId, clientContent, serverContent, serverUpdatedAt } =
      conflictData;
    const combined = `/* SERVER CHANGES (INCOMING) */\n${serverContent}\n\n/* LOCAL CHANGES (OUTGOING) */\n${clientContent}`;

    setOpenTabs((prev) =>
      prev.map((t) => {
        if (t.id === sheetId) {
          return {
            ...t,
            content: combined,
            originalContent: combined, // Keeps it dirty to force save
            loadedAt: serverUpdatedAt, // Sync timestamp to bypass conflict on next click
            isDirty: true,
          };
        }
        return t;
      }),
    );
    setConflictData(null);
    setRemoteTrigger((prev) => prev + 1);
    addToast("Combined both contents. Please review and save.", "info");
  };

  // Load archived sheet into live clipboard space
  const handleLoadArchivedToLive = async (sheetId) => {
    try {
      const res = await axios.post(`/sheets/load/${sheetId}`);
      setActiveSheet(res.data.liveSheet);
      setActiveTabId("live");
      setPreviewArchivedSheet(null);
      setRemoteTrigger((prev) => prev + 1);

      if (socket) {
        socket.emit("client_edit_sheet", {
          sheetId: res.data.liveSheet.id,
          content: res.data.liveSheet.content,
        });
      }
      addToast("Archived content loaded into Live Workspace.", "success");
    } catch (err) {
      addToast("Failed to load archived sheet.", "error");
    }
  };

  const handleDeleteArchivedSheet = async (sheetId) => {
    if (!confirm("Delete this archived sheet permanently?")) return;
    try {
      await axios.delete(`/sheets/saved/${sheetId}`);
      setPreviewArchivedSheet(null);
      const res = await axios.get("/sheets/archived");
      setArchivedSheets(res.data);
      if (socket) socket.emit("client_sheets_list_modified");
      addToast("Archived sheet deleted.", "info");
    } catch (err) {
      addToast("Failed to delete archived sheet.", "error");
    }
  };

  // Determine currently active editing model
  const activeSavedTab = openTabs.find((t) => t.id === activeTabId);
  const currentContent =
    activeTabId === "live" ? activeSheet?.content : activeSavedTab?.content;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        categories={categories}
        savedSheets={savedSheets}
        archivedSheets={archivedSheets}
        activeSheet={activeSheet}
        onCreateCategory={handleCreateCategory}
        onSaveLiveSheet={() => {
          setSaveTitle(activeSheet?.title || "");
          setSaveType("saved");
          setShowSaveModal(true);
        }}
        onDeleteLiveSheet={handleDeleteLiveSheet}
        onOpenSavedSheet={handleOpenSavedSheet}
        onOpenArchivedSheet={setPreviewArchivedSheet}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTabId={activeTabId}
      />

      {/* Main Workspace */}
      <main className="main-content">
        {/* Dynamic Tab Bar */}
        <div className="tab-bar">
          <div
            className={`tab-btn ${activeTabId === "live" ? "active" : ""}`}
            onClick={() => setActiveTabId("live")}
          >
            ⚡ Live Sheet
          </div>
          {openTabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab-btn ${activeTabId === tab.id ? "active" : ""}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>
                {tab.title} {tab.isDirty && "*"}
              </span>
              <span
                className="tab-close-btn"
                onClick={(e) => handleCloseTab(tab.id, e)}
              >
                ✕
              </span>
            </div>
          ))}
        </div>

        {/* Tab Header Toolbar */}
        <header
          className="header"
          style={{ height: activeTabId === "live" ? "56px" : "72px" }}
        >
          <div
            className="header-left"
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flex: 1,
              }}
            >
              <button
                className="btn hamburger-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                ☰
              </button>

              {activeTabId === "live" ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    className="sheet-title-input"
                    style={{ fontSize: "15px", fontWeight: 600 }}
                  >
                    {activeSheet?.title || "Loading..."}
                  </span>
                  {countdownText && (
                    <span
                      style={{ fontSize: "11px", color: "var(--text-muted)" }}
                    >
                      ⏳ {countdownText} (Auto-archives when timer hits zero)
                    </span>
                  )}
                </div>
              ) : (
                // Edit controls for Open Saved Sheet Tab
                activeSavedTab && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <input
                      type="text"
                      className="input-field"
                      style={{
                        width: "160px",
                        height: "28px",
                        fontSize: "13px",
                      }}
                      value={activeSavedTab.title}
                      onChange={(e) =>
                        handleTabPropertiesChange(
                          activeSavedTab.id,
                          "title",
                          e.target.value,
                        )
                      }
                    />
                    <select
                      className="select-type"
                      style={{
                        height: "28px",
                        fontSize: "12px",
                        padding: "0 24px 0 8px",
                      }}
                      value={activeSavedTab.category_id || ""}
                      onChange={(e) =>
                        handleTabPropertiesChange(
                          activeSavedTab.id,
                          "category_id",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    >
                      <option value="">No Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    {/* Show Save button if dirty, show Refresh button if not edited */}
                    {!activeSavedTab.isDirty ? (
                      <button
                        className="btn"
                        style={{
                          height: "28px",
                          fontSize: "11px",
                          borderColor: "var(--border-focus)",
                        }}
                        onClick={() =>
                          handleRefreshSavedSheet(activeSavedTab.id)
                        }
                      >
                        🔄 Refresh
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ height: "28px", fontSize: "11px" }}
                        onClick={() => handleSaveSavedSheet(activeSavedTab.id)}
                      >
                        Save Edits *
                      </button>
                    )}

                    <button
                      className="btn btn-danger"
                      style={{
                        height: "28px",
                        fontSize: "11px",
                        padding: "0 8px",
                      }}
                      onClick={() =>
                        handleDeleteSavedSheetFromTab(activeSavedTab.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="header-right">
              <button
                className="btn"
                style={{ borderColor: "var(--border-focus)" }}
                onClick={handleFormatJson}
                disabled={
                  activeTabId === "live" ? !activeSheet : !activeSavedTab
                }
                title="Convert loose key-value pairs into formatted JSON text block"
              >
                Format as JSON
              </button>
            </div>
          </div>
        </header>

        {/* Content Editor (Always Quill Rich Text Editor) */}
        {activeTabId === "live" ? (
          activeSheet ? (
            <div className="editor-container">
              <QuillEditor
                content={activeSheet.content}
                onChange={handleContentChange}
                remoteTrigger={remoteTrigger}
                sheetId={activeSheet.id}
              />
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
              }}
            >
              Initializing Live Space...
            </div>
          )
        ) : activeSavedTab ? (
          <div className="editor-container">
            <QuillEditor
              content={activeSavedTab.content}
              onChange={handleContentChange}
              remoteTrigger={remoteTrigger} // Synchronize remote triggers for saved tabs as well
              sheetId={activeSavedTab.id}
            />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
            }}
          >
            Select a tab to begin.
          </div>
        )}
      </main>

      {/* Save / Archive Live Sheet Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Save Live Clipboard Workspace</div>
            <form
              onSubmit={handleSaveLiveSheet}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  Sheet Title
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Daily Snippets"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  Folder Category
                </label>
                <select
                  className="select-type"
                  style={{ width: "100%" }}
                  value={saveCatId}
                  onChange={(e) => setSaveCatId(e.target.value)}
                >
                  <option value="">None (Uncategorized)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  Save Method
                </label>
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <label
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      border: "1px solid var(--border-color)",
                      padding: "8px",
                      cursor: "pointer",
                      borderRadius: "2px",
                    }}
                  >
                    <input
                      type="radio"
                      name="saveType"
                      value="saved"
                      checked={saveType === "saved"}
                      onChange={() => setSaveType("saved")}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600 }}>
                        Save Editable
                      </span>
                      <span
                        style={{ fontSize: "10px", color: "var(--text-muted)" }}
                      >
                        Allows future editing
                      </span>
                    </div>
                  </label>

                  <label
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      border: "1px solid var(--border-color)",
                      padding: "8px",
                      cursor: "pointer",
                      borderRadius: "2px",
                    }}
                  >
                    <input
                      type="radio"
                      name="saveType"
                      value="archived"
                      checked={saveType === "archived"}
                      onChange={() => setSaveType("archived")}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600 }}>
                        Archive (Read-Only)
                      </span>
                      <span
                        style={{ fontSize: "10px", color: "var(--text-muted)" }}
                      >
                        Cannot edit directly
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowSaveModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Git-like Conflict Resolution Modal */}
      {conflictData &&
        (() => {
          const leftLines = [];
          const rightLines = [];
          const diff = computeDiff(
            conflictData.serverContent,
            conflictData.clientContent,
          );

          diff.forEach((item) => {
            if (item.type === "common") {
              leftLines.push({ type: "common", val: item.value });
              rightLines.push({ type: "common", val: item.value });
            } else if (item.type === "removed") {
              leftLines.push({ type: "removed", val: item.value });
              rightLines.push({ type: "placeholder", val: "" });
            } else if (item.type === "added") {
              leftLines.push({ type: "placeholder", val: "" });
              rightLines.push({ type: "added", val: item.value });
            }
          });

          return (
            <div className="modal-overlay">
              <div className="modal" style={{ width: "700px" }}>
                <div
                  className="modal-title"
                  style={{ color: "var(--danger-color)" }}
                >
                  ⚠️ Concurrency Conflict: "{conflictData.title}"
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "8px",
                  }}
                >
                  This saved sheet was modified on another device after you
                  opened it. Red indicates deleted lines on server; Green
                  indicates your added lines.
                </p>

                {/* Side-by-side Scroll Aligned Git-like Diff Viewer */}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    border: "1px solid var(--border-color)",
                    height: "240px",
                    overflowY: "auto",
                    backgroundColor: "var(--bg-color)",
                    padding: "8px",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      borderRight: "1px solid var(--border-color)",
                      paddingRight: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginBottom: "4px",
                        fontWeight: 600,
                      }}
                    >
                      INCOMING (SERVER VERSION)
                    </div>
                    {leftLines.map((line, idx) => {
                      const lineStyle = {
                        fontFamily: "var(--font-sans)",
                        fontSize: "11px",
                        lineHeight: "1.5",
                        minHeight: "16px",
                        whiteSpace: "pre-wrap",
                        backgroundColor:
                          line.type === "removed"
                            ? "rgba(255, 51, 51, 0.15)"
                            : "transparent",
                        color:
                          line.type === "removed"
                            ? "#ff4444"
                            : "var(--text-color)",
                        padding: "0 4px",
                        borderLeft:
                          line.type === "removed"
                            ? "2px solid #ff4444"
                            : "none",
                      };
                      if (line.type === "placeholder") {
                        return (
                          <div key={idx} style={lineStyle}>
                            &nbsp;
                          </div>
                        );
                      }
                      return (
                        <div
                          key={idx}
                          style={lineStyle}
                          dangerouslySetInnerHTML={{
                            __html: line.val || "&nbsp;",
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ flex: 1, paddingLeft: "8px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginBottom: "4px",
                        fontWeight: 600,
                      }}
                    >
                      OUTGOING (YOUR VERSION)
                    </div>
                    {rightLines.map((line, idx) => {
                      const lineStyle = {
                        fontFamily: "var(--font-sans)",
                        fontSize: "11px",
                        lineHeight: "1.5",
                        minHeight: "16px",
                        whiteSpace: "pre-wrap",
                        backgroundColor:
                          line.type === "added"
                            ? "rgba(0, 204, 102, 0.15)"
                            : "transparent",
                        color:
                          line.type === "added"
                            ? "#00e676"
                            : "var(--text-color)",
                        padding: "0 4px",
                        borderLeft:
                          line.type === "added" ? "2px solid #00e676" : "none",
                      };
                      if (line.type === "placeholder") {
                        return (
                          <div key={idx} style={lineStyle}>
                            &nbsp;
                          </div>
                        );
                      }
                      return (
                        <div
                          key={idx}
                          style={lineStyle}
                          dangerouslySetInnerHTML={{
                            __html: line.val || "&nbsp;",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                <div
                  className="modal-actions"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    marginTop: "12px",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        flex: 1,
                        borderColor: "var(--success-color)",
                        color: "var(--success-color)",
                      }}
                      onClick={handleResolveKeepServer}
                    >
                      Keep Server Changes (Incoming)
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        flex: 1,
                        borderColor: "var(--warning-color)",
                        color: "var(--warning-color)",
                      }}
                      onClick={() =>
                        handleSaveSavedSheet(conflictData.sheetId, true)
                      }
                    >
                      Overwrite Server (Force Outgoing)
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    onClick={handleResolveCombine}
                  >
                    Combine Both Versions Side-by-Side to Manually Resolve
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ width: "100%", marginTop: "4px" }}
                    onClick={() => setConflictData(null)}
                  >
                    Close (Keep Editing Local Draft)
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Read-Only Archived Preview Modal */}
      {previewArchivedSheet && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewArchivedSheet(null)}
        >
          <div
            className="modal"
            style={{ width: "500px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">📦 Archived Clipboard (Read-Only)</div>
            <div
              style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px" }}
            >
              Title: {previewArchivedSheet.title}
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
                }}
                dangerouslySetInnerHTML={{
                  __html: previewArchivedSheet.content || "",
                }}
              />
            </div>

            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              To edit this content, load it into your live workspace and save it
              as a new editable sheet.
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
                onClick={() =>
                  handleLoadArchivedToLive(previewArchivedSheet.id)
                }
              >
                ⚡ Load into Live Workspace to Edit
              </button>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  onClick={() =>
                    handleDeleteArchivedSheet(previewArchivedSheet.id)
                  }
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
      )}

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <span className="toast-close" onClick={() => removeToast(toast.id)}>
              ✕
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Authentication Screen Component
function LoginScreen() {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Username and password are required.");
      return;
    }

    try {
      if (isRegistering) {
        await register(username.trim(), password.trim());
        setSuccessMsg("Registration successful! Please login.");
        setIsRegistering(false);
        setPassword("");
      } else {
        await login(username.trim(), password.trim());
      }
    } catch (err) {
      setErrorMsg(err.message || "Operation failed.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000000",
      }}
    >
      <div
        className="modal"
        style={{
          width: "340px",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-sidebar)",
        }}
      >
        <div
          className="modal-title"
          style={{ fontSize: "18px", textAlign: "center", marginBottom: "8px" }}
        >
          SyncPad <span>{isRegistering ? "Register" : "Login"}</span>
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          Seamless cross-device clipboard sync
        </div>

        {errorMsg && (
          <div
            style={{
              color: "var(--danger-color)",
              fontSize: "12px",
              border: "1px solid var(--danger-color)",
              padding: "6px",
              backgroundColor: "rgba(255,51,51,0.05)",
              textAlign: "center",
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              color: "var(--success-color)",
              fontSize: "12px",
              border: "1px solid var(--success-color)",
              padding: "6px",
              backgroundColor: "rgba(0,204,102,0.05)",
              textAlign: "center",
            }}
          >
            {successMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "var(--text-muted)",
                marginBottom: "4px",
              }}
            >
              Username
            </label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                color: "var(--text-muted)",
                marginBottom: "4px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", height: "36px", marginTop: "4px" }}
          >
            {isRegistering ? "Register Account" : "Authenticate"}
          </button>
        </form>

        <div
          style={{ textAlign: "center", marginTop: "8px", fontSize: "12px" }}
        >
          <button
            type="button"
            style={{
              color: "var(--text-muted)",
              textDecoration: "underline",
              cursor: "pointer",
            }}
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg("");
              setSuccessMsg("");
            }}
          >
            {isRegistering
              ? "Already have an account? Sign in"
              : "Need an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          color: "var(--text-muted)",
        }}
      >
        Restoring session...
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
