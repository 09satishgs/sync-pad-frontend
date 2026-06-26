import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { SocketProvider } from "./hooks/useSocket";
import AuthPage from "./pages/AuthPage/AuthPage";
import DashboardPage from "./pages/DashboardPage/DashboardPage";
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard";
import MaintenancePage from "./pages/MaintenancePage/MaintenancePage";
import api from "./api";
import { ENDPOINTS } from "./constants/config";
import { HEADINGS } from "./constants/headings";
import "./styles/global.css";

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
        {HEADINGS.AUTH.LOADING}
      </div>
    );
  }

  const isAdmin = user?.roles?.some(
    (r) => !r.workspace_id && r.access === "admin",
  );

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <AuthPage />}
        />
        <Route
          path="/admin"
          element={
            user && isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/workspace"
          element={user ? <DashboardPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/"
          element={
            user ? (
              isAdmin ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/workspace" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  const [healthy, setHealthy] = useState(null); // null = checking, true = healthy, false = unhealthy

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const res = await api.get(ENDPOINTS.HEALTH);
        if (res.data && res.data.status === "healthy") {
          setHealthy(true);
        } else {
          setHealthy(false);
        }
      } catch (err) {
        setHealthy(false);
      }
    };
    checkSystemHealth();
  }, []);

  if (healthy === null) {
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
        Checking system health...
      </div>
    );
  }

  if (healthy === false) {
    return <MaintenancePage />;
  }

  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
