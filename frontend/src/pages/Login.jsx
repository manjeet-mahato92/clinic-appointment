import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = [
  { key: 'hospital', label: 'Hospital / Clinic' },
  { key: 'super_admin', label: 'Super Admin' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'display', label: 'Display Control' },
];

const HOME_BY_ROLE = {
  hospital: '/hospital',
  doctor: '/doctor',
  super_admin: '/super-admin',
  display: '/display/select-doctor',
};

export default function Login() {
  const [role, setRole] = useState('hospital');
  const [form, setForm] = useState({ email: '', password: '', hospitalId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const creds = role === 'display'
        ? { hospitalId: form.hospitalId, password: form.password }
        : { email: form.email, password: form.password };
      await login(role, creds);
      navigate(HOME_BY_ROLE[role]);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="font-display font-bold text-2xl text-white">Clinic Token Manager</div>
          <p className="text-white/50 text-sm mt-1">Appointment &amp; token management for clinics</p>
        </div>

        <div className="card">
          <div className="grid grid-cols-2 gap-2 mb-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={`text-sm font-semibold rounded-lg px-3 py-2 border transition-colors ${
                  role === r.key
                    ? 'bg-clinical text-white border-clinical'
                    : 'bg-white text-slate border-slate-200 hover:border-clinical/40'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {role === 'display' ? (
              <div>
                <label className="label">Hospital / Clinic ID</label>
                <input className="input" value={form.hospitalId} onChange={set('hospitalId')} required
                  placeholder="Paste the Hospital ID given by your admin" />
              </div>
            ) : (
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={set('email')} required />
              </div>
            )}
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={form.password} onChange={set('password')} required />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-xs mt-4">
          Patient? <Link to="/book" className="underline hover:text-white">Book an appointment token</Link>
        </p>

        <div className="mt-6 text-xs text-white/40 leading-relaxed text-center">
          Demo: admin@clinictokens.app / SuperAdmin@123 &middot; reception@sunrise-clinic.test / Hospital@123
          <br />rohan.mehta@sunrise-clinic.test / Doctor@123
        </div>
      </div>
    </div>
  );
}
