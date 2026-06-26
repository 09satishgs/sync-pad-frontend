import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { HEADINGS } from "../../constants/headings";
import "./WorkspaceLandingPage.css";

export default function WorkspaceLandingPage() {
  const { logout, refreshSession } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await refreshSession();
      alert("Roles and session metadata refreshed successfully.");
      window.location.reload();
    } catch (err) {
      alert("Session refresh failed: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="landing-container">
      <div className="landing-card">
        <div className="landing-title">{HEADINGS.LANDING.TITLE}</div>
        <div className="landing-description">
          {HEADINGS.LANDING.DESCRIPTION}
        </div>
        <div className="landing-actions">
          <button
            className="btn btn-primary landing-btn"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? "🔄 Syncing..." : "🔄 Sync Roles"}
          </button>
          <button
            className="btn btn-danger landing-btn"
            onClick={logout}
            disabled={syncing}
          >
            {HEADINGS.SIDEBAR.LOGOUT_BTN}
          </button>
        </div>
      </div>
    </div>
  );
}
