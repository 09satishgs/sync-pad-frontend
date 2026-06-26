import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api";
import { ENDPOINTS } from "../constants/config";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkSession = async () => {
    try {
      setLoading(true);
      const res = await api.get(ENDPOINTS.AUTH.SESSION);
      setUser(res.data.user);
      setError(null);
    } catch (err) {
      setUser(null);
      // It's normal to get 401 when not logged in yet, so don't throw blocking errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      const res = await api.post(ENDPOINTS.AUTH.LOGIN, { username, password });
      setUser(res.data.user);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed";
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (username, password) => {
    try {
      setError(null);
      const res = await api.post(ENDPOINTS.AUTH.REGISTER, {
        username,
        password,
      });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await api.post(ENDPOINTS.AUTH.LOGOUT);
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const refreshSession = async () => {
    try {
      setError(null);
      const res = await api.post(ENDPOINTS.AUTH.REFRESH);
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      const msg = err.response?.data?.message || "Session refresh failed";
      console.error("Session refresh failed:", msg);
      throw new Error(msg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        checkSession,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
