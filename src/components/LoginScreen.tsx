import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (username: string, pass: string) => Promise<void>;
  appVer: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, appVer }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  return (
    <section id="loginScreen" aria-label="Sign In">
      <div className="login-card">
        <img src="/logo.png" alt="SALS" className="login-logo" />
        <h1>Sign In</h1>
        <p className="login-intro">CCTV Footage Request · Form OEF-25</p>
        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="field">
            <label htmlFor="lu">User ID</label>
            <input
              id="lu"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={40}
            />
          </div>
          <div className="field">
            <label htmlFor="lp">Password</label>
            <input
              id="lp"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </div>
          {error && (
            <p id="loginError" role="status" style={{ color: 'var(--danger)', fontSize: 12 }}>
              {error}
            </p>
          )}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
        </form>
        <p className="login-help">
          Roles: <b>admin</b> (Admin) &nbsp;•&nbsp; <b>Ismail</b> (User Full) &nbsp;•&nbsp;{' '}
          <b>Transport</b> (User Limited)
        </p>
        <p className="login-build">v{appVer}</p>
      </div>
      <footer className="login-footer">
        <p>© 2026 SALS Security Team. All rights reserved.</p>
        <p>
          This is the property of SALS Security Team and may not be reproduced, distributed, or
          used without prior written authorization.
        </p>
      </footer>
    </section>
  );
};
