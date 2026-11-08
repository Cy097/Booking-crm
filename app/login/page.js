'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.replace('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <i className="fa-solid fa-file-csv auth-logo"></i>
          <h1 className="auth-title">Sign In</h1>
          <p className="auth-subtitle">Access your Master Booking Control Hub Account</p>
        </div>

        {error && (
          <div className="error-message-box">
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-icon-wrapper">
              <i className="fa-solid fa-envelope input-icon"></i>
              <input
                id="email"
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-icon-wrapper">
              <i className="fa-solid fa-lock input-icon"></i>
              <input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? (
              <span><i className="fa-solid fa-circle-notch fa-spin"></i> Signing in...</span>
            ) : (
              <span><i className="fa-solid fa-right-to-bracket"></i> Sign In to Ledger</span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link href="/signup">Create an Account</Link>
        </div>
      </div>
    </div>
  );
}
