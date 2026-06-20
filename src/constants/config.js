export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_BASE_URL = `${BASE_URL}/api`;
export const WS_URL = import.meta.env.VITE_WS_URL || BASE_URL;

export const ENDPOINTS = {
  AUTH: {
    SESSION: '/auth/session',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
  },
  SHEETS: {
    LIVE: '/sheets/live',
    CATEGORIES: '/sheets/categories',
    SAVED: '/sheets/saved',
    ARCHIVED: '/sheets/archived',
    ARCHIVE_LIVE: '/sheets/archive-live',
    SAVE_LIVE: '/sheets/save-live',
    DELETE_LIVE: '/sheets/delete-live',
    SAVED_DETAIL: (id) => `/sheets/saved/${id}`,
    LOAD: (id) => `/sheets/load/${id}`,
  },
};
