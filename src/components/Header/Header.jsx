import React from 'react';
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
  handleFormatJson,
  isLiveLocked = false,
  handleTakeControl,
}) => {
  return (
    <header className="header" style={{ height: activeTabId === 'live' ? '56px' : '72px' }}>
      <div
        className="header-left"
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1,
          }}
        >
          <button className="btn hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>

          {activeTabId === 'live' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="sheet-title-input" style={{ fontSize: '15px', fontWeight: 600 }}>
                  {activeSheet?.title || 'Loading...'}
                </span>
                {countdownText && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ⏳ {countdownText} {HEADINGS.DASHBOARD.COUNTDOWN_SUFFIX}
                  </span>
                )}
              </div>

              {isLiveLocked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="badge badge-archived"
                    style={{
                      borderColor: 'var(--danger-color)',
                      color: 'var(--danger-color)',
                      backgroundColor: 'rgba(255, 51, 51, 0.05)',
                    }}
                  >
                    {HEADINGS.DASHBOARD.READ_ONLY_BADGE}
                  </span>
                  <button
                    className="btn btn-primary"
                    style={{ height: '24px', fontSize: '10px', padding: '0 8px' }}
                    onClick={handleTakeControl}
                  >
                    {HEADINGS.DASHBOARD.TAKE_CONTROL_BTN}
                  </button>
                </div>
              ) : (
                <span className="badge badge-live">{HEADINGS.DASHBOARD.EDITING_BADGE}</span>
              )}
            </div>
          ) : (
            activeSavedTab && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  flex: 1,
                }}
              >
                <input
                  type="text"
                  className="input-field"
                  style={{
                    width: '160px',
                    height: '28px',
                    fontSize: '13px',
                  }}
                  value={activeSavedTab.title}
                  onChange={(e) =>
                    handleTabPropertiesChange(activeSavedTab.id, 'title', e.target.value)
                  }
                />
                <select
                  className="select-type"
                  style={{
                    height: '28px',
                    fontSize: '12px',
                    padding: '0 24px 0 8px',
                  }}
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
                    className="btn"
                    style={{
                      height: '28px',
                      fontSize: '11px',
                      borderColor: 'var(--border-focus)',
                    }}
                    onClick={() => handleRefreshSavedSheet(activeSavedTab.id)}
                  >
                    🔄 Refresh
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ height: '28px', fontSize: '11px' }}
                    onClick={() => handleSaveSavedSheet(activeSavedTab.id)}
                  >
                    Save Edits *
                  </button>
                )}

                <button
                  className="btn btn-danger"
                  style={{
                    height: '28px',
                    fontSize: '11px',
                    padding: '0 8px',
                  }}
                  onClick={() => handleDeleteSavedSheetFromTab(activeSavedTab.id)}
                >
                  Delete
                </button>
              </div>
            )
          )}
        </div>

        <div className="header-right">
          <button
            className="btn"
            style={{ borderColor: 'var(--border-focus)' }}
            onClick={handleFormatJson}
            disabled={activeTabId === 'live' ? !activeSheet : !activeSavedTab}
            title="Convert loose key-value pairs into formatted JSON text block"
          >
            Format as JSON
          </button>
        </div>
      </div>
    </header>
  );
};
export default Header;
