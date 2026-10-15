import React, { useState } from 'react';
import { UserAccount, UserRole } from '../types';
import { isRoleAdmin, isRoleFull, isRoleLimited } from '../utils/auth';

interface ManageUsersModalProps {
  isOpen: boolean;
  currentUser: UserAccount;
  users: UserAccount[];
  onAddUser: (username: string, pass: string, role: UserRole) => Promise<void>;
  onDeleteUser: (username: string) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const ManageUsersModal: React.FC<ManageUsersModalProps> = ({
  isOpen,
  currentUser,
  users,
  onAddUser,
  onDeleteUser,
  onClose,
  onToast,
}) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('limited');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isAdmin = isRoleAdmin(currentUser);

  const canDelete = (u: UserAccount) => {
    if (u.u.toLowerCase() === 'admin' || u.u.toLowerCase() === currentUser.u.toLowerCase()) {
      return false;
    }
    if (isAdmin) return true;
    if (isRoleFull(currentUser) && isRoleLimited(u)) return true;
    return false;
  };

  const handleCreate = async () => {
    const u = newUsername.trim();
    const p = newPassword;
    const r = isAdmin ? newRole : 'limited';

    if (!/^[\w.-]{2,40}$/.test(u) || p.length < 4) {
      onToast('User ID 2–40 chars; password min 4');
      return;
    }
    if (users.some((z) => z.u.toLowerCase() === u.toLowerCase())) {
      onToast('User already exists');
      return;
    }

    setSubmitting(true);
    try {
      await onAddUser(u, p, r);
      setNewUsername('');
      setNewPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  const roleBadge = (r: UserRole) => {
    if (r === 'admin') return <span className="status-pill status-open">Admin</span>;
    if (r === 'full') return <span className="status-pill status-progress">User (Full)</span>;
    return <span className="status-pill status-closed">User (Limited)</span>;
  };

  return (
    <div
      className="modal-overlay show"
      id="mUsr"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box" style={{ maxWidth: 580 }}>
        <h3>Manage Users</h3>
        <p className="small-muted" style={{ margin: '4px 0 12px', fontSize: 12 }}>
          {isAdmin
            ? 'Admin can create User (Full) or User (Limited) accounts.'
            : 'User (Full) can create User (Limited) accounts (fill request, view tracker only).'}
        </p>

        <div className="grid">
          <div className="field">
            <label>New User ID</label>
            <input
              id="nu"
              maxLength={40}
              placeholder="e.g. officer.smith"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              id="np"
              type="password"
              placeholder="Min 4 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Account Role</label>
            <select
              id="nr"
              value={isAdmin ? newRole : 'limited'}
              disabled={!isAdmin}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
            >
              <option value="full">User (Full) – Full functionality, edit, delete & manage users</option>
              <option value="limited">
                User (Limited) – Fill request, view tracker only (unable to edit/delete)
              </option>
            </select>
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleCreate}
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </div>

        <div id="ul" style={{ marginTop: 14, maxHeight: 240, overflowY: 'auto' }}>
          <table className="compact-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>User ID</th>
                <th style={{ textAlign: 'left' }}>Role</th>
                <th style={{ textAlign: 'left' }}>Created By</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.u.toLowerCase() === currentUser.u.toLowerCase();
                const createdBy = u.u.toLowerCase() === 'admin' ? 'admin' : u.by || 'admin';
                return (
                  <tr key={u.u}>
                    <td>
                      <b>{u.u}</b>
                    </td>
                    <td>{roleBadge(u.role)}</td>
                    <td>
                      <span className="hc" style={{ fontSize: 12 }}>
                        {createdBy}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isMe ? (
                        <span className="hc" style={{ fontWeight: 600, fontSize: 12 }}>
                          (You)
                        </span>
                      ) : canDelete(u) ? (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => onDeleteUser(u.u)}
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="hc" style={{ fontSize: 12 }}>
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="actions" style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
