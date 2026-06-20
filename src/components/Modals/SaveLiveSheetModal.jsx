import React from 'react';
import { HEADINGS } from '../../constants/headings';
import './Modals.css';

export const SaveLiveSheetModal = ({
  showSaveModal,
  setShowSaveModal,
  saveTitle,
  setSaveTitle,
  saveCatId,
  setSaveCatId,
  saveType,
  setSaveType,
  categories,
  handleSaveLiveSheet,
}) => {
  if (!showSaveModal) return null;

  const content = HEADINGS.MODALS.SAVE_LIVE;

  return (
    <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{content.TITLE}</div>
        <form
          onSubmit={handleSaveLiveSheet}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
            >
              {content.TITLE_LABEL}
            </label>
            <input
              type="text"
              className="input-field"
              placeholder={content.TITLE_PLACEHOLDER}
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
            >
              {content.CAT_LABEL}
            </label>
            <select
              className="select-type"
              style={{ width: '100%' }}
              value={saveCatId}
              onChange={(e) => setSaveCatId(e.target.value)}
            >
              <option value="">{content.CAT_NONE}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}
            >
              {content.METHOD_LABEL}
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid var(--border-color)',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '2px',
                }}
              >
                <input
                  type="radio"
                  name="saveType"
                  value="saved"
                  checked={saveType === 'saved'}
                  onChange={() => setSaveType('saved')}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    {content.METHOD_EDITABLE_TITLE}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {content.METHOD_EDITABLE_DESC}
                  </span>
                </div>
              </label>

              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid var(--border-color)',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '2px',
                }}
              >
                <input
                  type="radio"
                  name="saveType"
                  value="archived"
                  checked={saveType === 'archived'}
                  onChange={() => setSaveType('archived')}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    {content.METHOD_ARCHIVE_TITLE}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {content.METHOD_ARCHIVE_DESC}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="btn" onClick={() => setShowSaveModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save & Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default SaveLiveSheetModal;
