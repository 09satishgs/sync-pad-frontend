import React from 'react';
import { HEADINGS } from '../../constants/headings';
import './Modals.css';

// LCS-based line-by-line diff calculator
function computeDiff(oldStr, newStr) {
  const oldLines = (oldStr || '').split('\n');
  const newLines = (newStr || '').split('\n');

  const dp = Array(oldLines.length + 1)
    .fill()
    .map(() => Array(newLines.length + 1).fill(0));
  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = oldLines.length;
  let j = newLines.length;
  const diff = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.unshift({ type: 'common', value: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'added', value: newLines[j - 1] });
      j--;
    } else {
      diff.unshift({ type: 'removed', value: oldLines[i - 1] });
      i--;
    }
  }
  return diff;
}

export const ConflictResolutionModal = ({
  conflictData,
  setConflictData,
  handleSaveSavedSheet,
  handleResolveKeepServer,
  handleResolveCombine,
}) => {
  if (!conflictData) return null;

  const leftLines = [];
  const rightLines = [];
  const diff = computeDiff(conflictData.serverContent, conflictData.clientContent);

  diff.forEach((item) => {
    if (item.type === 'common') {
      leftLines.push({ type: 'common', val: item.value });
      rightLines.push({ type: 'common', val: item.value });
    } else if (item.type === 'removed') {
      leftLines.push({ type: 'removed', val: item.value });
      rightLines.push({ type: 'placeholder', val: '' });
    } else if (item.type === 'added') {
      leftLines.push({ type: 'placeholder', val: '' });
      rightLines.push({ type: 'added', val: item.value });
    }
  });

  const content = HEADINGS.MODALS.CONFLICT;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: '700px' }}>
        <div className="modal-title" style={{ color: 'var(--danger-color)' }}>
          {content.TITLE}: "{conflictData.title}"
        </div>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginBottom: '8px',
          }}
        >
          {content.DESCRIPTION}
        </p>

        {/* Side-by-side Scroll Aligned Git-like Diff Viewer */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            border: '1px solid var(--border-color)',
            height: '240px',
            overflowY: 'auto',
            backgroundColor: 'var(--bg-color)',
            padding: '8px',
          }}
        >
          <div
            style={{
              flex: 1,
              borderRight: '1px solid var(--border-color)',
              paddingRight: '8px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                fontWeight: 600,
              }}
            >
              {content.INCOMING_HEADER}
            </div>
            {leftLines.map((line, idx) => {
              const lineStyle = {
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                lineHeight: '1.5',
                minHeight: '16px',
                whiteSpace: 'pre-wrap',
                backgroundColor: line.type === 'removed' ? 'rgba(255, 51, 51, 0.15)' : 'transparent',
                color: line.type === 'removed' ? '#ff4444' : 'var(--text-color)',
                padding: '0 4px',
                borderLeft: line.type === 'removed' ? '2px solid #ff4444' : 'none',
              };
              if (line.type === 'placeholder') {
                return (
                  <div key={idx} style={lineStyle}>
                    &nbsp;
                  </div>
                );
              }
              return (
                <div
                  key={idx}
                  style={lineStyle}
                  dangerouslySetInnerHTML={{
                    __html: line.val || '&nbsp;',
                  }}
                />
              );
            })}
          </div>
          <div style={{ flex: 1, paddingLeft: '8px' }}>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                fontWeight: 600,
              }}
            >
              {content.OUTGOING_HEADER}
            </div>
            {rightLines.map((line, idx) => {
              const lineStyle = {
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                lineHeight: '1.5',
                minHeight: '16px',
                whiteSpace: 'pre-wrap',
                backgroundColor: line.type === 'added' ? 'rgba(0, 204, 102, 0.15)' : 'transparent',
                color: line.type === 'added' ? '#00e676' : 'var(--text-color)',
                padding: '0 4px',
                borderLeft: line.type === 'added' ? '2px solid #00e676' : 'none',
              };
              if (line.type === 'placeholder') {
                return (
                  <div key={idx} style={lineStyle}>
                    &nbsp;
                  </div>
                );
              }
              return (
                <div
                  key={idx}
                  style={lineStyle}
                  dangerouslySetInnerHTML={{
                    __html: line.val || '&nbsp;',
                  }}
                />
              );
            })}
          </div>
        </div>

        <div
          className="modal-actions"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                borderColor: 'var(--success-color)',
                color: 'var(--success-color)',
              }}
              onClick={handleResolveKeepServer}
            >
              Keep Server Changes (Incoming)
            </button>
            <button
              type="button"
              className="btn"
              style={{
                flex: 1,
                borderColor: 'var(--warning-color)',
                color: 'var(--warning-color)',
              }}
              onClick={() => handleSaveSavedSheet(conflictData.sheetId, true)}
            >
              Overwrite Server (Force Outgoing)
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleResolveCombine}
          >
            Combine Both Versions Side-by-Side to Manually Resolve
          </button>
          <button
            type="button"
            className="btn"
            style={{ width: '100%', marginTop: '4px' }}
            onClick={() => setConflictData(null)}
          >
            Close (Keep Editing Local Draft)
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConflictResolutionModal;
