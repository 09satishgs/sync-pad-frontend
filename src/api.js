import axios from "axios";
import { API_BASE_URL } from "./constants/config";

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const activeControllers = new Map();

export const getCancelSignal = (key) => {
  if (!key) return null;
  if (activeControllers.has(key)) {
    try {
      activeControllers.get(key).abort();
    } catch (e) {
      console.warn("Error aborting request:", e);
    }
  }
  const controller = new AbortController();
  activeControllers.set(key, controller);
  return controller.signal;
};

export const clearCancelKey = (key) => {
  if (key) activeControllers.delete(key);
};

const request = async (config, cancelKey) => {
  const signal = cancelKey ? getCancelSignal(cancelKey) : null;
  try {
    const response = await client({
      ...config,
      signal: signal || config.signal,
    });
    return response;
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log(`Request cancelled: ${config.url}`);
    }
    throw error;
  } finally {
    if (cancelKey) {
      clearCancelKey(cancelKey);
    }
  }
};

export const api = {
  get: (url, config = {}, cancelKey = null) =>
    request({ method: "GET", url, ...config }, cancelKey),
  post: (url, data, config = {}, cancelKey = null) =>
    request({ method: "POST", url, data, ...config }, cancelKey),
  put: (url, data, config = {}, cancelKey = null) =>
    request({ method: "PUT", url, data, ...config }, cancelKey),
  delete: (url, config = {}, cancelKey = null) =>
    request({ method: "DELETE", url, ...config }, cancelKey),
};

export default api;
