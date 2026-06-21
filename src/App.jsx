import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { SocketProvider } from "./hooks/useSocket";
import AuthPage from "./pages/AuthPage/AuthPage";
import DashboardPage from "./pages/DashboardPage/DashboardPage";
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard";
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
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
