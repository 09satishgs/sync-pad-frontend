import { useState, useEffect, useRef } from "react";
import axios from "axios";
import api from "../../api";
import { ENDPOINTS } from "../../constants/config";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";

export const useDashboardPage = () => {
  const { user } = useAuth();
  const socket = useSocket();

  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    if (!socket) return;
    const handleConnect = () => setSocketId(socket.id);
    const handleDisconnect = () => setSocketId(null);

    if (socket.connected) {
      setSocketId(socket.id);
    } else {
      setSocketId(null);
    }
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  // Workspace States
  const [workspaces, setWorkspaces] = useState([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [workspaceMembers, setWorkspaceMembers] = useState([]);

  // Core Data States
  const [activeSheet, setActiveSheet] = useState(null);
  const [categories, setCategories] = useState([]);
  const [savedSheets, setSavedSheets] = useState([]);
  const [archivedSheets, setArchivedSheets] = useState([]);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

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

  // Collaborative sheet locking state
  const [sheetLock, setSheetLock] = useState({
    isLocked: false,
    lockedBy: null,
    lockedBySocketId: null,
  });

  // Conflict Resolution States
  const [conflictData, setConflictData] = useState(null); // { sheetId, title, clientContent, serverContent, loadedAt, serverUpdatedAt }

  // Archived Preview Modal States
  const [previewArchivedSheet, setPreviewArchivedSheet] = useState(null); // { id, title, content }

  // Collaborative input autofocus fixer state
  const [remoteTrigger, setRemoteTrigger] = useState(0);

  // Refs for debouncing WebSocket transmissions
  const transmitTimeoutRef = useRef(null);

  // Calculate roles
  const activeWorkspaceRole = user?.roles?.find(
    (r) => r.workspace_id === Number(activeWorkspaceId),
  );
  const isMaintainer = activeWorkspaceRole?.access === "maintainer";
  const isAdmin = user?.roles?.some(
    (r) =>
      (r.workspace_id === null ||
        r.workspace_id === undefined ||
        r.workspace_id === 0) &&
      r.access === "admin",
  );

  // Load Initial Workspace Data
  const loadWorkspace = async (workspaceId, signal) => {
    if (!workspaceId) return;
    try {
      setLoadingFiles(true);
      const [liveRes, catRes, savedRes, archivedRes, filesRes] =
        await Promise.all([
          api.get(ENDPOINTS.SHEETS.LIVE(workspaceId), { signal }),
          api.get(ENDPOINTS.SHEETS.CATEGORIES(workspaceId), { signal }),
          api.get(ENDPOINTS.SHEETS.SAVED(workspaceId), { signal }),
          api.get(ENDPOINTS.SHEETS.ARCHIVED(workspaceId), { signal }),
          api.get(ENDPOINTS.FILES.LIST(workspaceId), { signal }),
        ]);
      setActiveSheet(liveRes.data);
      setCategories(catRes.data);
      setSavedSheets(savedRes.data);
      setArchivedSheets(archivedRes.data);
      setFiles(filesRes.data);
    } catch (err) {
      if (!axios.isCancel(err) && err.name !== "CanceledError") {
        console.error("Failed to load workspace data:", err);
        addToast("Failed to load workspace data.", "error");
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchWorkspaces = async (signal) => {
    try {
      setLoadingWorkspaces(true);
      const res = await api.get(ENDPOINTS.WORKSPACES.LIST, { signal });
      setWorkspaces(res.data);
    } catch (err) {
      if (!axios.isCancel(err) && err.name !== "CanceledError") {
        console.error("Failed to load workspaces:", err);
        addToast("Failed to load workspaces.", "error");
      }
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchWorkspaces(controller.signal);
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    localStorage.setItem("activeWorkspaceId", activeWorkspaceId);

    // Reset workspace-specific view states when switching workspaces
    setActiveTabId("live");
    setOpenTabs([]);
    setConflictData(null);
    setPreviewArchivedSheet(null);

    const controller = new AbortController();
    loadWorkspace(activeWorkspaceId, controller.signal);
    return () => {
      controller.abort();
    };
  }, [activeWorkspaceId]);

  // Default workspace selection priority
  useEffect(() => {
    if (workspaces.length > 0 && user && !activeWorkspaceId) {
      const savedWsId = localStorage.getItem("activeWorkspaceId");
      const hasSavedWs = workspaces.some((ws) => ws.id === Number(savedWsId));

      let initialWsId = null;
      if (hasSavedWs) {
        initialWsId = Number(savedWsId);
      } else {
        // Priority 1: Maintainer workspaces
        const maintainerWs = workspaces.find((ws) => {
          const role = user?.roles?.find((r) => r.workspace_id === ws.id);
          return role?.access === "maintainer";
        });

        if (maintainerWs) {
          initialWsId = maintainerWs.id;
        } else {
          // Priority 2: Member workspaces
          const memberWs = workspaces.find((ws) => {
            const role = user?.roles?.find((r) => r.workspace_id === ws.id);
            return role?.access === "member";
          });
          if (memberWs) {
            initialWsId = memberWs.id;
          } else {
            initialWsId = workspaces[0].id;
          }
        }
      }

      if (initialWsId) {
        setActiveWorkspaceId(initialWsId);
      }
    }
  }, [workspaces, user, activeWorkspaceId]);

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
    if (!socket || !activeSheet || !activeWorkspaceId) return;

    // Notify the server which sheet we are viewing (passes username, and tab change will trigger lock transfer)
    const registerViewing = () => {
      const targetSheetId = activeTabId === "live" ? activeSheet.id : activeTabId;
      if (targetSheetId) {
        socket.emit("client_viewing_sheet", {
          sheetId: targetSheetId,
          username: user?.username,
        });
      }
    };

    if (socket.connected) {
      registerViewing();
    }
    socket.on("connect", registerViewing);

    // Listen for lock status updates
    socket.on("sheet_lock_status", (data) => {
      setSheetLock(data);
    });

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
      api
        .get(ENDPOINTS.SHEETS.ARCHIVED(activeWorkspaceId))
        .then((res) => setArchivedSheets(res.data));
    });

    // Listen for general lists update signals (saved sheets, categories created/deleted, files uploaded/deleted)
    socket.on("sheets_list_updated", () => {
      api
        .get(ENDPOINTS.SHEETS.SAVED(activeWorkspaceId))
        .then((res) => setSavedSheets(res.data));
      api
        .get(ENDPOINTS.SHEETS.ARCHIVED(activeWorkspaceId))
        .then((res) => setArchivedSheets(res.data));
      api
        .get(ENDPOINTS.SHEETS.CATEGORIES(activeWorkspaceId))
        .then((res) => setCategories(res.data));
      api
        .get(ENDPOINTS.FILES.LIST(activeWorkspaceId))
        .then((res) => setFiles(res.data))
        .catch((err) => console.error("Socket files update error:", err));
    });

    return () => {
      socket.off("connect", registerViewing);
      socket.off("server_sheet_content_updated");
      socket.off("server_sheet_background_updated");
      socket.off("live_sheet_archived");
      socket.off("sheets_list_updated");
      socket.off("sheet_lock_status");
    };
  }, [socket, activeSheet?.id, activeTabId, user?.username, activeWorkspaceId]);

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

  const activeSavedTab = openTabs.find((t) => t.id === activeTabId);

  // Create Category Request
  const handleCreateCategory = async (name) => {
    if (!activeWorkspaceId) return;
    try {
      await api.post(ENDPOINTS.SHEETS.CATEGORIES(activeWorkspaceId), { name });
      if (socket) socket.emit("client_sheets_list_modified");
      addToast(`Category "${name}" created.`, "success");
      // Immediate local reload
      const catRes = await api.get(
        ENDPOINTS.SHEETS.CATEGORIES(activeWorkspaceId),
      );
      setCategories(catRes.data);
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to create category",
        "error",
      );
    }
  };

  // Create Saved Sheet Directly in Category
  const handleCreateSheetInCategory = async (title, categoryId) => {
    if (!activeWorkspaceId || !title.trim()) return;
    try {
      const res = await api.post(ENDPOINTS.SHEETS.SAVED(activeWorkspaceId), {
        title: title.trim(),
        category_id: categoryId || null,
      });

      // Refresh saved sheets lists
      const savedRes = await api.get(ENDPOINTS.SHEETS.SAVED(activeWorkspaceId));
      setSavedSheets(savedRes.data);

      if (socket) socket.emit("client_sheets_list_modified");
      addToast(`Sheet "${title}" created successfully.`, "success");

      // Auto-open new sheet in tab
      const newSheet =
        savedRes.data.find(
          (s) => s.title === title.trim() && s.category_id === categoryId,
        ) || res.data;
      if (newSheet) {
        handleOpenSavedSheet(newSheet);
      }
    } catch (err) {
      console.error("Failed to create sheet in category:", err);
      addToast(
        err.response?.data?.message || "Failed to create sheet",
        "error",
      );
    }
  };

  // Save/Archive live sheet from modal
  const handleSaveLiveSheet = async (e) => {
    e.preventDefault();
    if (!saveTitle.trim() || !activeWorkspaceId) return;

    try {
      const endpoint =
        saveType === "archived"
          ? ENDPOINTS.SHEETS.ARCHIVE_LIVE(activeWorkspaceId)
          : ENDPOINTS.SHEETS.SAVE_LIVE(activeWorkspaceId);

      let res;
      if (saveType === "archived") {
        const fileContent = activeSheet?.content || "";
        const textBlob = new Blob([fileContent], { type: "text/plain" });
        const textFile = new File([textBlob], `${saveTitle.trim()}.txt`, {
          type: "text/plain",
        });

        const formData = new FormData();
        formData.append("title", saveTitle.trim());
        if (saveCatId !== "") {
          formData.append("category_id", Number(saveCatId));
        }
        formData.append("file", textFile);

        res = await api.post(endpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.post(endpoint, {
          title: saveTitle.trim(),
          category_id: saveCatId === "" ? null : Number(saveCatId),
        });
      }

      // Load new live sheet and close modal
      setActiveSheet(res.data.newLiveSheet);
      setShowSaveModal(false);
      setSaveTitle("");
      setSaveCatId("");

      // Reload lists
      const [savedRes, archivedRes] = await Promise.all([
        api.get(ENDPOINTS.SHEETS.SAVED(activeWorkspaceId)),
        api.get(ENDPOINTS.SHEETS.ARCHIVED(activeWorkspaceId)),
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
    if (!activeWorkspaceId) return;
    if (
      !confirm(
        "Are you sure you want to discard your current live sheet? All unsaved edits will be lost.",
      )
    ) {
      return;
    }

    try {
      const res = await api.post(
        ENDPOINTS.SHEETS.DELETE_LIVE(activeWorkspaceId),
      );
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

  const handleOpenArchivedSheet = async (sheet) => {
    if (!sheet) return;
    setPreviewArchivedSheet({ ...sheet, loading: true });
    try {
      const res = await api.get(
        ENDPOINTS.SHEETS.SAVED_DETAIL(activeWorkspaceId, sheet.id),
      );
      setPreviewArchivedSheet({ ...res.data, loading: false });
    } catch (err) {
      console.error("Failed to load archive content:", err);
      addToast("Failed to load archive content.", "error");
      setPreviewArchivedSheet(null);
    }
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
    if (!tab || !activeWorkspaceId) return;

    try {
      // Pass the cancelKey using the tabId to abort active redundant saves for the same tab
      const res = await api.put(
        ENDPOINTS.SHEETS.SAVED_DETAIL(activeWorkspaceId, tabId),
        {
          title: tab.title,
          content: tab.content,
          category_id: tab.category_id,
          loadedAt: tab.loadedAt,
          force,
        },
        {},
        `save-sheet-${tabId}`,
      );

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
      const savedRes = await api.get(ENDPOINTS.SHEETS.SAVED(activeWorkspaceId));
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
      } else if (err.name !== "CanceledError") {
        addToast(
          err.response?.data?.message || "Failed to save changes.",
          "error",
        );
      }
    }
  };

  // Fetch the latest sheet version from DB and reload tab if un-edited
  const handleRefreshSavedSheet = async (tabId) => {
    if (!activeWorkspaceId) return;
    try {
      const res = await api.get(
        ENDPOINTS.SHEETS.SAVED(activeWorkspaceId),
        {},
        `refresh-sheet-${tabId}`,
      );
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
      if (err.name !== "CanceledError") {
        addToast("Failed to refresh sheet content.", "error");
      }
    }
  };

  // Delete saved sheet directly from tab controls
  const handleDeleteSavedSheetFromTab = async (sheetId) => {
    if (!activeWorkspaceId) return;
    if (
      !confirm("Are you sure you want to delete this saved sheet permanently?")
    ) {
      return;
    }
    try {
      await api.delete(
        ENDPOINTS.SHEETS.SAVED_DETAIL(activeWorkspaceId, sheetId),
      );
      setOpenTabs((prev) => prev.filter((t) => t.id !== sheetId));
      setActiveTabId("live");

      const savedRes = await api.get(ENDPOINTS.SHEETS.SAVED(activeWorkspaceId));
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
    if (!activeWorkspaceId) return;
    try {
      const res = await api.post(
        ENDPOINTS.SHEETS.LOAD(activeWorkspaceId, sheetId),
      );
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
    if (!activeWorkspaceId) return;
    if (!confirm("Delete this archived sheet permanently?")) return;
    try {
      await api.delete(
        ENDPOINTS.SHEETS.SAVED_DETAIL(activeWorkspaceId, sheetId),
      );
      setPreviewArchivedSheet(null);
      const res = await api.get(ENDPOINTS.SHEETS.ARCHIVED(activeWorkspaceId));
      setArchivedSheets(res.data);
      if (socket) socket.emit("client_sheets_list_modified");
      addToast("Archived sheet deleted.", "info");
    } catch (err) {
      addToast("Failed to delete archived sheet.", "error");
    }
  };

  const fetchMembers = async (workspaceId) => {
    if (!workspaceId) return;
    try {
      const res = await api.get(ENDPOINTS.WORKSPACES.GET_MEMBERS(workspaceId));
      setWorkspaceMembers(res.data);
    } catch (err) {
      console.error("Failed to fetch workspace members:", err);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !activeWorkspaceId) return;
    try {
      await api.post(ENDPOINTS.WORKSPACES.ADD_MEMBER(activeWorkspaceId), {
        username: inviteUsername.trim(),
      });
      addToast(`User "${inviteUsername}" invited successfully.`, "success");
      setInviteUsername("");
      fetchMembers(activeWorkspaceId);
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to invite member.",
        "error",
      );
    }
  };

  useEffect(() => {
    if (showInviteModal && activeWorkspaceId) {
      fetchMembers(activeWorkspaceId);
    }
  }, [showInviteModal, activeWorkspaceId]);

  const isLiveLocked =
    activeTabId === "live" &&
    sheetLock.isLocked &&
    sheetLock.lockedBySocketId !== socketId;

  const handleTakeControl = () => {
    if (socket && activeSheet) {
      if (
        confirm(
          "Are you sure you want to take over editing control of this live sheet? This will make other devices' views read-only.",
        )
      ) {
        socket.emit("client_take_control_sheet", {
          sheetId: activeSheet.id,
          username: user?.username,
        });
      }
    }
  };

  // Fetch only files
  const fetchFiles = async (workspaceId) => {
    if (!workspaceId) return;
    try {
      setLoadingFiles(true);
      const res = await api.get(ENDPOINTS.FILES.LIST(workspaceId));
      setFiles(res.data);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Upload file
  const handleUploadFile = async (file) => {
    if (!activeWorkspaceId) return;
    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post(ENDPOINTS.FILES.UPLOAD(activeWorkspaceId), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      addToast(`File "${file.name}" uploaded successfully.`, "success");
      await fetchFiles(activeWorkspaceId);
      if (socket) socket.emit("client_sheets_list_modified");
    } catch (err) {
      console.error("File upload failed:", err);
      addToast(err.response?.data?.message || "File upload failed.", "error");
    } finally {
      setUploadingFile(false);
    }
  };

  // Delete file
  const handleDeleteFile = async (fileId) => {
    if (!activeWorkspaceId) return;
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await api.delete(ENDPOINTS.FILES.DELETE(activeWorkspaceId, fileId));
      addToast("File deleted successfully.", "success");
      await fetchFiles(activeWorkspaceId);
      if (socket) socket.emit("client_sheets_list_modified");
    } catch (err) {
      console.error("File deletion failed:", err);
      addToast(err.response?.data?.message || "File deletion failed.", "error");
    }
  };

  return {
    workspaces,
    loadingWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    showInviteModal,
    setShowInviteModal,
    inviteUsername,
    setInviteUsername,
    workspaceMembers,
    handleInviteMember,
    isMaintainer,
    isAdmin,
    isLiveLocked,
    activeSheet,
    categories,
    savedSheets,
    archivedSheets,
    openTabs,
    activeTabId,
    sidebarOpen,
    toasts,
    showSaveModal,
    saveTitle,
    saveCatId,
    saveType,
    countdownText,
    conflictData,
    previewArchivedSheet,
    remoteTrigger,
    setActiveTabId,
    setSidebarOpen,
    setSaveTitle,
    setSaveCatId,
    setSaveType,
    setShowSaveModal,
    setPreviewArchivedSheet,
    setConflictData,
    handleContentChange,
    handleCreateCategory,
    handleCreateSheetInCategory,
    handleSaveLiveSheet,
    handleDeleteLiveSheet,
    handleOpenSavedSheet,
    handleOpenArchivedSheet,
    handleCloseTab,
    handleSaveSavedSheet,
    handleRefreshSavedSheet,
    handleDeleteSavedSheetFromTab,
    handleTabPropertiesChange,
    handleResolveKeepServer,
    handleResolveCombine,
    handleLoadArchivedToLive,
    handleDeleteArchivedSheet,
    removeToast,
    activeSavedTab,
    sheetLock,
    handleTakeControl,
    files,
    loadingFiles,
    uploadingFile,
    handleUploadFile,
    handleDeleteFile,
  };
};
