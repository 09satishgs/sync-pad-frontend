import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { HEADINGS } from "../../constants/headings";
import { customAlert } from "../../components/CustomAlerts/CustomAlerts";
import "./WorkspaceLandingPage.css";

export default function WorkspaceLandingPage() {
  const { logout, refreshSession } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await refreshSession();
      await customAlert("Roles and session metadata refreshed successfully.");
      window.location.reload();
    } catch (err) {
      await customAlert("Sync failed: " + err.message);
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
            className="btn btn-primary landing-btn flex-center flex-gap-4"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={14} className={syncing ? "spin-animation" : ""} />
            {syncing ? "Syncing..." : "Sync Roles"}
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
