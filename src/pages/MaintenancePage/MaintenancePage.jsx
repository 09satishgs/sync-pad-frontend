import React from "react";
import { RefreshCw } from "lucide-react";
import "./MaintenancePage.css";

export const MaintenancePage = () => {
  const getExpectedCompletionTime = () => {
    const now = new Date();
    
    // Get current UTC date components
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth(); // 0-11
    const date = now.getUTCDate();
    
    // Create new UTC date representing tomorrow at 12:00:00 UTC
    const targetDate = new Date(Date.UTC(year, month, date + 1, 12, 0, 0));
    
    const pad = (num) => String(num).padStart(2, "0");
    const yyyy = targetDate.getUTCFullYear();
    const mm = pad(targetDate.getUTCMonth() + 1);
    const dd = pad(targetDate.getUTCDate());
    
    return `${yyyy}-${mm}-${dd} 12:00:00 PM UTC`;
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="maintenance-container">
      <div className="maintenance-bg-glow" />
      <div className="maintenance-card">
        <div className="maintenance-icon-wrapper">
          <svg className="maintenance-icon-gear" viewBox="0 0 24 24">
            <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
          </svg>
        </div>
        <h1 className="maintenance-title">System Undergoing Maintenance</h1>
        <p className="maintenance-text">
          SyncPad is currently undergoing database maintenance to improve stability and performance. We expect to be back online shortly.
        </p>
        <div className="maintenance-time-box">
          <div className="maintenance-time-label">Expected Completion Time</div>
          <div className="maintenance-time-value">{getExpectedCompletionTime()}</div>
        </div>
        <button className="maintenance-retry-btn flex-center flex-gap-4" onClick={handleRetry}>
          <RefreshCw size={16} /> Retry Connection
        </button>
      </div>
    </div>
  );
};

export default MaintenancePage;
