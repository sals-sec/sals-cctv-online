import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (officer: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
}) => {
  const [officer, setOfficer] = useState(settings.officer || '');

  useEffect(() => {
    if (isOpen) {
      setOfficer(settings.officer || '');
    }
  }, [isOpen, settings.officer]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay show"
      id="mSet"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        <h3>Settings</h3>
        <div className="field">
          <label>Default “Received By” (Security Officer)</label>
          <input
            id="sOff"
            value={officer}
            onChange={(e) => setOfficer(e.target.value)}
            placeholder="e.g. Officer John"
          />
        </div>
        <p className="small-muted" style={{ marginTop: 8 }}>
          Theme and default officer apply to this browser only.
        </p>
        <div
          className="actions"
          style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onSave(officer.trim())}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
