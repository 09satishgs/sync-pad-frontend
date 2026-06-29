import React from 'react';
import { Zap } from 'lucide-react';
import { HEADINGS } from '../../constants/headings';
import './TabBar.css';

export const TabBar = ({ openTabs, activeTabId, setActiveTabId, handleCloseTab }) => {
  return (
    <div className="tab-bar">
      <div
        className={`tab-btn flex-align flex-gap-3 ${activeTabId === 'live' ? 'active' : ''}`}
        onClick={() => setActiveTabId('live')}
      >
        <Zap size={14} />
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
