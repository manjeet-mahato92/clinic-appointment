import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

export default function ForgotPassword() {
  const [form, setForm] = useState({ email: '', role: 'hospital' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-dark.svg" alt="Clinqo" className="h-10 mx-auto mb-2" />
          <h1 className="text-ink text-2xl font-bold">Forgot Your Password?</h1>
          <p className="text-slate-soft mt-1">Enter your email and we'll help you reset it.</p>
        </div>

        <div className="card p-6">
          {success ? (
            <div className="text-center">
              <div className="text-signal text-5xl mb-4">✓</div>
              <h2 className="text-xl font-bold text-ink">Check Your Console</h2>
              <p className="text-slate-soft mt-2">
                For development purposes, a password reset link has been printed to the backend server console.
              </p>
              <Link to="/login" className="btn-secondary w-full mt-6">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">I am a...</label>
                <select className="input" value={form.role} onChange={set('role')}>
                  <option value="hospital">Hospital / Clinic</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>
              <div>
                <label className="label">Account Email</label>
                <input type="email" className="input" value={form.email} onChange={set('email')} required placeholder="Enter your login email" />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
        {!success && (
          <p className="text-center text-slate-soft text-sm mt-6">
            Remembered your password? <Link to="/login" className="underline hover:text-clinical">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
