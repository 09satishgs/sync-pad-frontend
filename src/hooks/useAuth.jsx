import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure Axios defaults for credentials (cookie sending)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = `${API_URL}/api`;
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkSession = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/auth/session');
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
      const res = await axios.post('/auth/login', { username, password });
      setUser(res.data.user);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (username, password) => {
    try {
      setError(null);
      const res = await axios.post('/auth/register', { username, password });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
