import React from 'react';
import { useAuthPage } from './useAuthPage';
import { HEADINGS } from '../../constants/headings';
import './AuthPage.css';

export default function AuthPage() {
  const {
    isRegistering,
    username,
    setUsername,
    password,
    setPassword,
    errorMsg,
    successMsg,
    handleSubmit,
    toggleRegisterMode,
  } = useAuthPage();

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-title">
          {HEADINGS.APP_TITLE}{' '}
          <span>
            {isRegistering
              ? HEADINGS.AUTH.REGISTER_TITLE.split(' ')[1]
              : HEADINGS.AUTH.LOGIN_TITLE.split(' ')[1]}
          </span>
        </div>
        <div className="auth-subtitle">{HEADINGS.AUTH.SUBTITLE}</div>

        {errorMsg && <div className="auth-error-message">{errorMsg}</div>}

        {successMsg && <div className="auth-success-message">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label className="auth-label">Username</label>
            <input
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="auth-form-group">
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary auth-submit-btn">
            {isRegistering ? 'Register Account' : 'Authenticate'}
          </button>
        </form>

        <div className="auth-toggle-btn-container">
          <button type="button" className="auth-toggle-btn" onClick={toggleRegisterMode}>
            {isRegistering
              ? 'Already have an account? Sign in'
              : 'Need an account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
