import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from './useSidebar';
import { HEADINGS } from '../../constants/headings';
import './Sidebar.css';

export const Sidebar = ({
  categories,
  savedSheets,
  archivedSheets = [],
  activeSheet,
  onCreateCategory,
  onSaveLiveSheet,
  onDeleteLiveSheet,
  onOpenSavedSheet,
  onOpenArchivedSheet,
  sidebarOpen,
  setSidebarOpen,
  activeTabId,
}) => {
  const { user, logout } = useAuth();
  const {
    newCatName,
    setNewCatName,
    showCatInput,
    setShowCatInput,
    expandedCats,
    toggleCategory,
    handleCreateCategorySubmit,
  } = useSidebar({ onCreateCategory });

  // Group saved sheets by category
  const sheetsByCat = {};
  const uncategorizedSheets = [];

  savedSheets.forEach((sheet) => {
    if (sheet.category_id) {
      if (!sheetsByCat[sheet.category_id]) {
        sheetsByCat[sheet.category_id] = [];
      }
      sheetsByCat[sheet.category_id].push(sheet);
    } else {
      uncategorizedSheets.push(sheet);
    }
  });

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          {HEADINGS.APP_TITLE} <span>{HEADINGS.APP_VERSION}</span>
        </div>
        <button
          className="btn"
          style={{ display: 'none', padding: '0 6px', height: '24px' }}
          onClick={() => setSidebarOpen(false)}
        >
          ✕
        </button>
      </div>

      <div className="sidebar-content">
        {/* Active Live Sheet Status */}
        <div className="sidebar-section-title">{HEADINGS.SIDEBAR.WORKSPACE_TITLE}</div>
        {activeSheet ? (
          <div
            className={`sidebar-item ${activeTabId === 'live' ? 'active' : ''}`}
            onClick={() => onOpenSavedSheet({ id: 'live' })}
          >
            <div className="sidebar-item-label">
              <span className="badge badge-live">Live</span>
              <span style={{ fontWeight: 500 }}>{activeSheet.title}</span>
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
            {HEADINGS.SIDEBAR.NO_ACTIVE_SHEET}
          </div>
        )}

        {/* Live Workspace Actions */}
        <div style={{ display: 'flex', gap: '4px', padding: '4px 8px' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, fontSize: '11px', height: '28px' }}
            onClick={onSaveLiveSheet}
          >
            Save / Archive
          </button>
          <button
            className="btn btn-danger"
            style={{ fontSize: '11px', height: '28px' }}
            onClick={onDeleteLiveSheet}
            title="Delete and Reset Live Sheet"
          >
            Reset
          </button>
        </div>

        {/* Saved Folders / Categories */}
        <div className="sidebar-section-title">{HEADINGS.SIDEBAR.SAVED_SHEETS_TITLE}</div>

        {/* Create Category Trigger */}
        {showCatInput ? (
          <form onSubmit={handleCreateCategorySubmit} style={{ padding: '0 8px 8px 8px' }}>
            <input
              type="text"
              className="input-field"
              placeholder={HEADINGS.SIDEBAR.NEW_CAT_PLACEHOLDER}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              autoFocus
              style={{ height: '28px', fontSize: '12px', marginBottom: '4px' }}
            />
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, height: '24px', fontSize: '10px' }}
              >
                {HEADINGS.SIDEBAR.ADD_BTN}
              </button>
              <button
                type="button"
                className="btn"
                style={{ height: '24px', fontSize: '10px' }}
                onClick={() => setShowCatInput(false)}
              >
                {HEADINGS.SIDEBAR.CANCEL_BTN}
              </button>
            </div>
          </form>
        ) : (
          <button
            className="btn"
            style={{
              width: 'calc(100% - 16px)',
              margin: '0 8px 8px 8px',
              height: '26px',
              fontSize: '11px',
              borderStyle: 'dashed',
            }}
            onClick={() => setShowCatInput(true)}
          >
            {HEADINGS.SIDEBAR.NEW_CAT_BTN}
          </button>
        )}

        <div style={{ padding: '0 8px' }}>
          {/* Categories and their sheets */}
          {categories.map((cat) => {
            const isExpanded = !!expandedCats[cat.id];
            const catSheets = sheetsByCat[cat.id] || [];
            return (
              <div key={cat.id} className="category-folder">
                <div className="category-header" onClick={() => toggleCategory(cat.id)}>
                  <span>
                    📁 {cat.name} ({catSheets.length})
                  </span>
                  <span>{isExpanded ? '▼' : '▶'}</span>
                </div>
                {isExpanded && (
                  <div className="category-sheets">
                    {catSheets.length === 0 ? (
                      <div
                        style={{
                          padding: '6px 8px',
                          color: 'var(--text-muted)',
                          fontSize: '11px',
                        }}
                      >
                        {HEADINGS.SIDEBAR.EMPTY_FOLDER}
                      </div>
                    ) : (
                      catSheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          className={`sidebar-item ${
                            activeTabId === sheet.id ? 'active' : ''
                          }`}
                          onClick={() => onOpenSavedSheet(sheet)}
                        >
                          <div className="sidebar-item-label">
                            <span>{sheet.title}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Uncategorized Sheets Folder */}
          <div className="category-folder">
            <div className="category-header" onClick={() => toggleCategory('uncat')}>
              <span>
                📁 Uncategorized ({uncategorizedSheets.length})
              </span>
              <span>{expandedCats['uncat'] ? '▼' : '▶'}</span>
            </div>
            {expandedCats['uncat'] && (
              <div className="category-sheets">
                {uncategorizedSheets.length === 0 ? (
                  <div
                    style={{
                      padding: '6px 8px',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                    }}
                  >
                    {HEADINGS.SIDEBAR.EMPTY_FOLDER}
                  </div>
                ) : (
                  uncategorizedSheets.map((sheet) => (
                    <div
                      key={sheet.id}
                      className={`sidebar-item ${activeTabId === sheet.id ? 'active' : ''}`}
                      onClick={() => onOpenSavedSheet(sheet)}
                    >
                      <div className="sidebar-item-label">
                        <span>{sheet.title}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Archived Sheets Section */}
        <div className="sidebar-section-title">{HEADINGS.SIDEBAR.ARCHIVED_SHEETS_TITLE}</div>
        <div style={{ padding: '0 8px' }}>
          {archivedSheets.length === 0 ? (
            <div style={{ padding: '6px 8px', color: 'var(--text-muted)', fontSize: '12px' }}>
              {HEADINGS.SIDEBAR.NO_ARCHIVED_SHEETS}
            </div>
          ) : (
            archivedSheets.map((sheet) => (
              <div
                key={sheet.id}
                className="sidebar-item"
                onClick={() => onOpenArchivedSheet(sheet)}
                style={{ opacity: 0.7 }}
              >
                <div className="sidebar-item-label">
                  <span>📦 {sheet.title}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User profile footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '140px',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              {HEADINGS.SIDEBAR.ACTIVE_USER}
            </span>
            <div style={{ fontWeight: 600 }}>{user?.username}</div>
          </div>
          <button
            className="btn"
            style={{ fontSize: '11px', padding: '0 8px', height: '26px' }}
            onClick={logout}
          >
            {HEADINGS.SIDEBAR.LOGOUT_BTN}
          </button>
        </div>
      </div>
    </aside>
  );
};
