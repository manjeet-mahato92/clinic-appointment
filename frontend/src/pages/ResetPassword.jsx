import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo-dark.svg" alt="Clinqo" className="h-10 mx-auto mb-2" />
          </div>
          <div className="card text-center p-8">
            <h2 className="text-xl font-bold text-danger">Invalid Link</h2>
            <p className="text-slate-soft mt-2">This password reset link is missing a token. Please request a new one.</p>
            <Link to="/forgot-password" className="btn-secondary w-full mt-6">Request New Link</Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo-dark.svg" alt="Clinqo" className="h-10 mx-auto mb-2" />
          </div>
          <div className="card text-center p-8">
            <div className="text-signal text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-ink">Password Reset Successfully!</h2>
            <p className="text-slate-soft mt-2">You will be redirected to the login page shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-dark.svg" alt="Clinqo" className="h-10 mx-auto mb-2" />
          <h1 className="text-ink text-2xl font-bold">Set a New Password</h1>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">New Password</label>
            <input type="password" value={form.password} onChange={set('password')} className="input" required />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" value={form.confirm_password} onChange={set('confirm_password')} className="input" required />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
