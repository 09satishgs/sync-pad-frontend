import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api from '../../api';
import { ENDPOINTS } from '../../constants/config';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

// Loose JS Object key-value quoting formatter
const makeValidJsonString = (str) => {
  if (!str.trim()) return '';
  let clean = str;

  // 1. Replace single-quoted keys: 'key': -> "key":
  clean = clean.replace(/([{,\s])'([a-zA-Z0-9_$]+)'\s*:/g, '$1"$2":');

  // 2. Quote unquoted keys: key: -> "key":
  clean = clean.replace(/([{,\s])([a-zA-Z0-9_$]+)\s*:/g, (match, p1, p2) => {
    if (p2 === 'true' || p2 === 'false' || p2 === 'null') {
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

export const useDashboardPage = () => {
  const { user } = useAuth();
  const socket = useSocket();

  // Core Data States
  const [activeSheet, setActiveSheet] = useState(null);
  const [categories, setCategories] = useState([]);
  const [savedSheets, setSavedSheets] = useState([]);
  const [archivedSheets, setArchivedSheets] = useState([]);

  // Parallel Workspace Tabs States
  const [openTabs, setOpenTabs] = useState([]); // [{ id, title, content, originalContent, category_id, loadedAt, isDirty }]
  const [activeTabId, setActiveTabId] = useState('live'); // 'live' or saved sheet id (number)

  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveCatId, setSaveCatId] = useState('');
  const [saveType, setSaveType] = useState('saved'); // 'saved' vs 'archived'
  const [countdownText, setCountdownText] = useState('');

  // Collaborative sheet locking state
  const [sheetLock, setSheetLock] = useState({ isLocked: false, lockedBy: null, lockedBySocketId: null });

  // Conflict Resolution States
  const [conflictData, setConflictData] = useState(null); // { sheetId, title, clientContent, serverContent, loadedAt, serverUpdatedAt }

  // Archived Preview Modal States
  const [previewArchivedSheet, setPreviewArchivedSheet] = useState(null); // { id, title, content }

  // Collaborative input autofocus fixer state
  const [remoteTrigger, setRemoteTrigger] = useState(0);

  // Refs for debouncing WebSocket transmissions
  const transmitTimeoutRef = useRef(null);

  // Load Initial Workspace Data
  const loadWorkspace = async (signal) => {
    try {
      const [liveRes, catRes, savedRes, archivedRes] = await Promise.all([
        api.get(ENDPOINTS.SHEETS.LIVE, { signal }),
        api.get(ENDPOINTS.SHEETS.CATEGORIES, { signal }),
        api.get(ENDPOINTS.SHEETS.SAVED, { signal }),
        api.get(ENDPOINTS.SHEETS.ARCHIVED, { signal }),
      ]);
      setActiveSheet(liveRes.data);
      setCategories(catRes.data);
      setSavedSheets(savedRes.data);
      setArchivedSheets(archivedRes.data);
    } catch (err) {
      if (!axios.isCancel(err) && err.name !== 'CanceledError') {
        console.error('Failed to load workspace data:', err);
        addToast('Failed to load workspace data.', 'error');
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadWorkspace(controller.signal);
    return () => {
      controller.abort();
    };
  }, []);

  // Update remaining expiration time countdown for Live Sheet
  useEffect(() => {
    if (!activeSheet || !activeSheet.expires_at) {
      setCountdownText('');
      return;
    }

    const updateCountdown = () => {
      const expiresTime = new Date(activeSheet.expires_at).getTime();
      const diffMs = expiresTime - Date.now();

      if (diffMs <= 0) {
        setCountdownText('Archiving...');
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

    // Notify the server which sheet we are viewing (passes username, and tab change will trigger lock transfer)
    const targetSheetId = activeTabId === 'live' ? activeSheet.id : activeTabId;
    if (targetSheetId) {
      socket.emit('client_viewing_sheet', { sheetId: targetSheetId, username: user?.username });
    }

    // Listen for lock status updates
    socket.on('sheet_lock_status', (data) => {
      setSheetLock(data);
    });

    // Listen for live updates on the viewing sheet
    socket.on('server_sheet_content_updated', (data) => {
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
    socket.on('server_sheet_background_updated', (data) => {
      addToast(`Sheet "${data.title}" updated from another device.`, 'info');
    });

    // Listen for auto-archive triggers
    socket.on('live_sheet_archived', (data) => {
      addToast(data.message, 'warning');
      setActiveSheet(data.newLiveSheet);
      setRemoteTrigger((prev) => prev + 1);
      api.get(ENDPOINTS.SHEETS.ARCHIVED).then((res) => setArchivedSheets(res.data));
    });

    // Listen for general lists update signals (saved sheets, categories created/deleted)
    socket.on('sheets_list_updated', () => {
      api.get(ENDPOINTS.SHEETS.SAVED).then((res) => setSavedSheets(res.data));
      api.get(ENDPOINTS.SHEETS.ARCHIVED).then((res) => setArchivedSheets(res.data));
      api.get(ENDPOINTS.SHEETS.CATEGORIES).then((res) => setCategories(res.data));
    });

    return () => {
      socket.off('server_sheet_content_updated');
      socket.off('server_sheet_background_updated');
      socket.off('live_sheet_archived');
      socket.off('sheets_list_updated');
      socket.off('sheet_lock_status');
    };
  }, [socket, activeSheet?.id, activeTabId, user?.username]);

  // Toast System Helpers
  const addToast = (message, type = 'info') => {
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
    if (activeTabId === 'live') {
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
          socket.emit('client_edit_sheet', {
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
        })
      );
    }
  };

  const activeSavedTab = openTabs.find((t) => t.id === activeTabId);

  // Clean and Format document contents as JSON
  const handleFormatJson = () => {
    const content =
      activeTabId === 'live' ? activeSheet?.content : activeSavedTab?.content;
    if (!content) {
      addToast('No content to format.', 'warning');
      return;
    }

    // Convert HTML blocks/paragraphs to plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    // Replace all non-breaking spaces with standard spaces to avoid JSON parsing issues
    const cleanText = plainText.replace(/\u00a0/g, ' ');

    try {
      const cleaned = makeValidJsonString(cleanText);
      const parsed = JSON.parse(cleaned);
      const formattedJson = JSON.stringify(parsed, null, 2);

      // Format as paragraph blocks with spaces replaced by &nbsp; to prevent collapsing
      const htmlValue = formattedJson
        .split('\n')
        .map((line) => {
          const escaped = line
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/ /g, '&nbsp;');
          return `<p>${escaped || '<br>'}</p>`;
        })
        .join('');

      handleContentChange(htmlValue);
      setRemoteTrigger((prev) => prev + 1); // Reset local editor innerHTML DOM values
      addToast('JSON formatted successfully.', 'success');
    } catch (err) {
      addToast(`Invalid JSON: ${err.message}`, 'error');
    }
  };

  // Create Category Request
  const handleCreateCategory = async (name) => {
    try {
      await api.post(ENDPOINTS.SHEETS.CATEGORIES, { name });
      if (socket) socket.emit('client_sheets_list_modified');
      addToast(`Category "${name}" created.`, 'success');
    } catch (err) {
      addToast(
        err.response?.data?.message || 'Failed to create category',
        'error'
      );
    }
  };

  // Save/Archive live sheet from modal
  const handleSaveLiveSheet = async (e) => {
    e.preventDefault();
    if (!saveTitle.trim()) return;

    try {
      const endpoint =
        saveType === 'archived'
          ? ENDPOINTS.SHEETS.ARCHIVE_LIVE
          : ENDPOINTS.SHEETS.SAVE_LIVE;
      const res = await api.post(endpoint, {
        title: saveTitle.trim(),
        category_id: saveCatId === '' ? null : Number(saveCatId),
      });

      // Load new live sheet and close modal
      setActiveSheet(res.data.newLiveSheet);
      setShowSaveModal(false);
      setSaveTitle('');
      setSaveCatId('');

      // Reload lists
      const [savedRes, archivedRes] = await Promise.all([
        api.get(ENDPOINTS.SHEETS.SAVED),
        api.get(ENDPOINTS.SHEETS.ARCHIVED),
      ]);
      setSavedSheets(savedRes.data);
      setArchivedSheets(archivedRes.data);

      // Emit list update to other devices
      if (socket) socket.emit('client_sheets_list_modified');
      addToast(
        saveType === 'archived'
          ? 'Live sheet auto-archived. Fresh sheet started.'
          : 'Live sheet saved as editable. Fresh sheet started.',
        'success'
      );
    } catch (err) {
      addToast('Failed to save live sheet.', 'error');
    }
  };

  // Reset live sheet (delete current live and make a fresh blank one)
  const handleDeleteLiveSheet = async () => {
    if (
      !confirm(
        'Are you sure you want to discard your current live sheet? All unsaved edits will be lost.'
      )
    ) {
      return;
    }

    try {
      const res = await api.post(ENDPOINTS.SHEETS.DELETE_LIVE);
      setActiveSheet(res.data.newLiveSheet);
      if (socket) socket.emit('client_sheets_list_modified');
      addToast('Live sheet has been reset.', 'info');
    } catch (err) {
      addToast('Failed to reset sheet.', 'error');
    }
  };

  // Tabs workspace handlers
  const handleOpenSavedSheet = (sheet) => {
    if (sheet.id === 'live') {
      setActiveTabId('live');
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
        content: sheet.content || '',
        originalContent: sheet.content || '',
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
      setActiveTabId('live');
    }
  };

  // Save saved sheet edits manually
  const handleSaveSavedSheet = async (tabId, force = false) => {
    const tab = openTabs.find((t) => t.id === tabId);
    if (!tab) return;

    try {
      // Pass the cancelKey using the tabId to abort active redundant saves for the same tab
      const res = await api.put(
        ENDPOINTS.SHEETS.SAVED_DETAIL(tabId),
        {
          title: tab.title,
          content: tab.content,
          category_id: tab.category_id,
          loadedAt: tab.loadedAt,
          force,
        },
        {},
        `save-sheet-${tabId}`
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
        })
      );

      // Refresh saved sheets lists
      const savedRes = await api.get(ENDPOINTS.SHEETS.SAVED);
      setSavedSheets(savedRes.data);

      if (socket) socket.emit('client_sheets_list_modified');
      setConflictData(null);
      addToast(`Changes to "${tab.title}" saved successfully.`, 'success');
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
      } else if (err.name !== 'CanceledError') {
        addToast(
          err.response?.data?.message || 'Failed to save changes.',
          'error'
        );
      }
    }
  };

  // Fetch the latest sheet version from DB and reload tab if un-edited
  const handleRefreshSavedSheet = async (tabId) => {
    try {
      const res = await api.get(ENDPOINTS.SHEETS.SAVED, {}, `refresh-sheet-${tabId}`);
      const latestSheet = res.data.find((s) => s.id === tabId);

      if (latestSheet) {
        setOpenTabs((prev) =>
          prev.map((t) => {
            if (t.id === tabId) {
              return {
                ...t,
                title: latestSheet.title,
                content: latestSheet.content || '',
                originalContent: latestSheet.content || '',
                loadedAt: latestSheet.updated_at,
                category_id: latestSheet.category_id,
                isDirty: false,
              };
            }
            return t;
          })
        );

        setSavedSheets(res.data);
        setRemoteTrigger((prev) => prev + 1); // Trigger DOM editor updates
        addToast(
          `Sheet "${latestSheet.title}" reloaded with latest server content.`,
          'success'
        );
      } else {
        addToast('This sheet no longer exists on the server.', 'error');
      }
    } catch (err) {
      if (err.name !== 'CanceledError') {
        addToast('Failed to refresh sheet content.', 'error');
      }
    }
  };

  // Delete saved sheet directly from tab controls
  const handleDeleteSavedSheetFromTab = async (sheetId) => {
    if (
      !confirm('Are you sure you want to delete this saved sheet permanently?')
    ) {
      return;
    }
    try {
      await api.delete(ENDPOINTS.SHEETS.SAVED_DETAIL(sheetId));
      setOpenTabs((prev) => prev.filter((t) => t.id !== sheetId));
      setActiveTabId('live');

      const savedRes = await api.get(ENDPOINTS.SHEETS.SAVED);
      setSavedSheets(savedRes.data);

      if (socket) socket.emit('client_sheets_list_modified');
      addToast('Sheet deleted.', 'info');
    } catch (err) {
      addToast('Failed to delete sheet.', 'error');
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
      })
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
      })
    );
    setConflictData(null);
    setRemoteTrigger((prev) => prev + 1); // Reset local editor view
    addToast('Discarded local changes and pulled server edits.', 'info');
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
      })
    );
    setConflictData(null);
    setRemoteTrigger((prev) => prev + 1);
    addToast('Combined both contents. Please review and save.', 'info');
  };

  // Load archived sheet into live clipboard space
  const handleLoadArchivedToLive = async (sheetId) => {
    try {
      const res = await api.post(ENDPOINTS.SHEETS.LOAD(sheetId));
      setActiveSheet(res.data.liveSheet);
      setActiveTabId('live');
      setPreviewArchivedSheet(null);
      setRemoteTrigger((prev) => prev + 1);

      if (socket) {
        socket.emit('client_edit_sheet', {
          sheetId: res.data.liveSheet.id,
          content: res.data.liveSheet.content,
        });
      }
      addToast('Archived content loaded into Live Workspace.', 'success');
    } catch (err) {
      addToast('Failed to load archived sheet.', 'error');
    }
  };

  const handleDeleteArchivedSheet = async (sheetId) => {
    if (!confirm('Delete this archived sheet permanently?')) return;
    try {
      await api.delete(ENDPOINTS.SHEETS.SAVED_DETAIL(sheetId));
      setPreviewArchivedSheet(null);
      const res = await api.get(ENDPOINTS.SHEETS.ARCHIVED);
      setArchivedSheets(res.data);
      if (socket) socket.emit('client_sheets_list_modified');
      addToast('Archived sheet deleted.', 'info');
    } catch (err) {
      addToast('Failed to delete archived sheet.', 'error');
    }
  };

  const isLiveLocked = activeTabId === 'live' && sheetLock.isLocked && sheetLock.lockedBySocketId !== socket?.id;

  const handleTakeControl = () => {
    if (socket && activeSheet) {
      if (
        confirm(
          "Are you sure you want to take over editing control of this live sheet? This will make other devices' views read-only."
        )
      ) {
        socket.emit('client_take_control_sheet', {
          sheetId: activeSheet.id,
          username: user?.username,
        });
      }
    }
  };

  return {
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
    handleFormatJson,
    handleCreateCategory,
    handleSaveLiveSheet,
    handleDeleteLiveSheet,
    handleOpenSavedSheet,
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
  };
};
