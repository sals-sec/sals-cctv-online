import React, { useRef } from 'react';
import { UserAccount } from '../types';
import { isRoleAdmin, isRoleFull, roleName } from '../utils/auth';

interface HeaderProps {
  user: UserAccount;
  requestCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenUsers: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  requestCount,
  isDark,
  onToggleTheme,
  onOpenSettings,
  onOpenUsers,
  onLogout,
}) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const canManage = isRoleAdmin(user) || isRoleFull(user);

  const closeMenu = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  return (
    <header className="no-print">
      <div className="brand">
        <img src="/logo.png" alt="SALS" />
        <h1>
          <span>CCTV Footage Request</span>
        </h1>
      </div>
      <div className="header-utilities">
        <span className="header-count hc" id="cntHeader">
          {requestCount} request{requestCount === 1 ? '' : 's'}
        </span>
        <details className="account-menu" ref={detailsRef}>
          <summary>
            <span id="who" className="account-name">
              {user.u}
            </span>{' '}
            <span aria-hidden="true">⌄</span>
          </summary>
          <div className="account-menu-items">
            <div className="account-role-badge">Role: {roleName(user.role)}</div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                closeMenu();
                onOpenSettings();
              }}
            >
              Settings
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              id="themeToggle"
              onClick={() => {
                closeMenu();
                onToggleTheme();
              }}
            >
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
            {canManage && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  closeMenu();
                  onOpenUsers();
                }}
              >
                Manage Users
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                closeMenu();
                onLogout();
              }}
            >
              Sign Out
            </button>
          </div>
        </details>
      </div>
    </header>
  );
};
