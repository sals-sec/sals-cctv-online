import React from 'react';
import { CctvRequest } from '../types';

interface DeleteModalProps {
  request: CctvRequest | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ request, onCancel, onConfirm }) => {
  if (!request) return null;

  return (
    <div
      className="modal-overlay show"
      id="mDel"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-box">
        <h3>Delete Request?</h3>
        <p id="dtx" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Delete {request.no} ({request.name || 'Unnamed'})? This cannot be undone. Consider exporting a
          backup first.
        </p>
        <div
          className="actions"
          style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}
        >
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
