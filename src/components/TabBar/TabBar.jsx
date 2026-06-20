import React from 'react';
import { HEADINGS } from '../../constants/headings';
import './TabBar.css';

export const TabBar = ({ openTabs, activeTabId, setActiveTabId, handleCloseTab }) => {
  return (
    <div className="tab-bar">
      <div
        className={`tab-btn ${activeTabId === 'live' ? 'active' : ''}`}
        onClick={() => setActiveTabId('live')}
      >
        {HEADINGS.DASHBOARD.LIVE_SHEET_TAB}
      </div>
      {openTabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab-btn ${activeTabId === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTabId(tab.id)}
        >
          <span>
            {tab.title} {tab.isDirty && '*'}
          </span>
          <span className="tab-close-btn" onClick={(e) => handleCloseTab(tab.id, e)}>
            ✕
          </span>
        </div>
      ))}
    </div>
  );
};
export default TabBar;
