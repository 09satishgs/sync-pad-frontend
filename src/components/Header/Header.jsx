import React from 'react';
import { Menu, Clock, Lock, RefreshCw } from 'lucide-react';
import { HEADINGS } from '../../constants/headings';
import './Header.css';

export const Header = ({
  activeTabId,
  activeSheet,
  countdownText,
  activeSavedTab,
  categories,
  sidebarOpen,
  setSidebarOpen,
  handleTabPropertiesChange,
  handleRefreshSavedSheet,
  handleSaveSavedSheet,
  handleDeleteSavedSheetFromTab,
  isLiveLocked = false,
  handleTakeControl,
}) => {
  return (
    <header className={`header ${activeTabId === 'live' ? 'live-tab' : 'saved-tab'}`}>
      <div className="header-left header-inner">
        <div className="header-left-inner">
          <button className="btn hamburger-btn flex-center" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={18} />
          </button>

          {activeTabId === 'live' ? (
            <div className="flex-align flex-gap-4">
              <div className="flex-column">
                <span className="sheet-title-input">
                  {activeSheet?.title || 'Loading...'}
                </span>
                {countdownText && (
                  <span className="header-countdown">
                    <Clock size={12} /> {countdownText} {HEADINGS.DASHBOARD.COUNTDOWN_SUFFIX}
                  </span>
                )}
              </div>

              {isLiveLocked ? (
                <div className="flex-align flex-gap-2">
                  <span className="badge badge-archived-danger">
                    <Lock size={12} />
                    {HEADINGS.DASHBOARD.READ_ONLY_BADGE}
                  </span>
                  <button
                    className="btn btn-primary btn-take-control"
                    onClick={handleTakeControl}
                  >
                    {HEADINGS.DASHBOARD.TAKE_CONTROL_BTN}
                  </button>
                </div>
              ) : (
                <span className="badge badge-live flex-align flex-gap-3">
                  <span className="status-dot-success" />
                  {HEADINGS.DASHBOARD.EDITING_BADGE}
                </span>
              )}
            </div>
          ) : (
            activeSavedTab && (
              <div className="header-editor-meta">
                <input
                  type="text"
                  className="input-field header-title-input"
                  value={activeSavedTab.title}
                  onChange={(e) =>
                    handleTabPropertiesChange(activeSavedTab.id, 'title', e.target.value)
                  }
                />
                <select
                  className="select-type header-category-select"
                  value={activeSavedTab.category_id || ''}
                  onChange={(e) =>
                    handleTabPropertiesChange(
                      activeSavedTab.id,
                      'category_id',
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                >
                  <option value="">No Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {!activeSavedTab.isDirty ? (
                  <button
                    className="btn header-refresh-btn"
                    onClick={() => handleRefreshSavedSheet(activeSavedTab.id)}
                  >
                    <RefreshCw size={12} /> Refresh
                  </button>
                ) : (
                  <button
                    className="btn btn-primary header-save-btn"
                    onClick={() => handleSaveSavedSheet(activeSavedTab.id)}
                  >
                    Save Edits *
                  </button>
                )}

                <button
                  className="btn btn-danger header-delete-btn"
                  onClick={() => handleDeleteSavedSheetFromTab(activeSavedTab.id)}
                >
                  Delete
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
};
export default Header;
