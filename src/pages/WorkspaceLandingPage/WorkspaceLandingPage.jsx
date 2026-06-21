import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { HEADINGS } from "../../constants/headings";
import "./WorkspaceLandingPage.css";

export default function WorkspaceLandingPage() {
  const { logout } = useAuth();

  return (
    <div className="landing-container">
      <div className="landing-card">
        <div className="landing-title">{HEADINGS.LANDING.TITLE}</div>
        <div className="landing-description">
          {HEADINGS.LANDING.DESCRIPTION}
        </div>
        <div className="landing-actions">
          <button
            className="btn btn-danger landing-logout-btn"
            onClick={logout}
          >
            {HEADINGS.SIDEBAR.LOGOUT_BTN}
          </button>
        </div>
      </div>
    </div>
  );
}
