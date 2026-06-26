export const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/syncpad";
export const API_BASE_URL = `${BASE_URL}/api`;
export const WS_URL = import.meta.env.VITE_WS_URL || BASE_URL;

export const ENDPOINTS = {
  AUTH: {
    SESSION: "/auth/session",
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/session/refresh",
  },
  WORKSPACES: {
    LIST: "/workspaces",
    ADD_MEMBER: (id) => `/workspaces/${id}/members`,
    GET_MEMBERS: (id) => `/workspaces/${id}/members`,
  },
  SHEETS: {
    LIVE: (wsId) => `/workspaces/${wsId}/sheets/live`,
    CATEGORIES: (wsId) => `/workspaces/${wsId}/sheets/categories`,
    SAVED: (wsId) => `/workspaces/${wsId}/sheets/saved`,
    ARCHIVED: (wsId) => `/workspaces/${wsId}/sheets/archived`,
    ARCHIVE_LIVE: (wsId) => `/workspaces/${wsId}/sheets/archive-live`,
    SAVE_LIVE: (wsId) => `/workspaces/${wsId}/sheets/save-live`,
    DELETE_LIVE: (wsId) => `/workspaces/${wsId}/sheets/delete-live`,
    SAVED_DETAIL: (wsId, id) => `/workspaces/${wsId}/sheets/saved/${id}`,
    LOAD: (wsId, id) => `/workspaces/${wsId}/sheets/load/${id}`,
  },
  FILES: {
    LIST: (wsId) => `/workspaces/${wsId}/files`,
    UPLOAD: (wsId) => `/workspaces/${wsId}/files`,
    DOWNLOAD: (wsId, fileId) => `/workspaces/${wsId}/files/${fileId}/download`,
    DELETE: (wsId, fileId) => `/workspaces/${wsId}/files/${fileId}`,
  },
  ADMIN: {
    TABLES: "/admin/db/tables",
    TABLE_DETAIL: (tableName) => `/admin/db/tables/${tableName}`,
    USERS: "/admin/users",
    USER_ROLES: (userId) => `/admin/users/${userId}/roles`,
    WORKSPACES: "/admin/workspaces",
    WORKSPACE_MEMBERS: (workspaceId) =>
      `/admin/workspaces/${workspaceId}/members`,
  },
};
