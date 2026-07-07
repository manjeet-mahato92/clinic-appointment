import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';
import { STATES, LOCATIONS } from '../utils/locations.js';

const EMPTY_FORM = {
  hospital_name: '', email: '', password: '', contact_number: '', hospital_address: '',
  timing: '', activation_date: '', payment_reference: '',
  rep_name: '', rep_contact_number: '', rep_designation: '',
};

const ResetPasswordModal = ({ hospital, onClose, onSave }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!password) {
      setError('Password cannot be empty.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.patch(`/super-admin/hospitals/${hospital.id}`, { password });
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Set New Password for ${hospital.hospital_name}`}>
      <div className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" required />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <button onClick={handleSave} className="btn-primary w-full" disabled={saving}>{saving ? 'Saving...' : 'Set New Password'}</button>
      </div>
    </Modal>
  );
};

export default function SuperAdminHospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [passwordResetTarget, setPasswordResetTarget] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ state: '', district: '' });
  const navigate = useNavigate();

  const load = () => {
    const params = { q: searchQuery, ...filters };
    api.get('/super-admin/hospitals', { params }).then((r) => setHospitals(r.data));
  };
  useEffect(() => {
    const handler = setTimeout(() => load(), 300); // Debounce search
    return () => clearTimeout(handler);
  }, [searchQuery, filters]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, ...(k === 'state' && { district: '' }) }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/super-admin/hospitals', form);
      setOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.error || `Could not create hospital`);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id, status) => {
    await api.patch(`/super-admin/hospitals/${id}/status`, { status });
    load();
  };

  const remove = async (id) => {
    if (!confirm('Are you sure you want to delete this hospital? This action is irreversible.')) return;
    await api.delete(`/super-admin/hospitals/${id}`);
    load();
  };

  const copyId = (id) => navigator.clipboard?.writeText(id);

  return (
    <Layout title="Super Admin" navItems={superAdminNav}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Hospitals & Clinics</h1>
          <p className="text-slate-soft">Onboard clinics and manage their access with clear, lightweight controls.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>+ Add Hospital</button>
      </div>

      <div className="card p-4 mb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input
            className="input lg:col-span-2"
            placeholder="Search by name, email, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select className="input" value={filters.state} onChange={setFilter('state')}>
            <option value="">All States</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={filters.district} onChange={setFilter('district')} disabled={!filters.state}>
            <option value="">All Districts</option>
            {(LOCATIONS[filters.state] || []).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <button className="btn-secondary" onClick={() => { setSearchQuery(''); setFilters({ state: '', district: '' }); }}>Clear Filters</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper text-slate-soft text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Hospital</th>
                <th className="text-left px-5 py-3">Contact</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Activated</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hospitals.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <button onClick={() => navigate(`/super-admin/hospitals/${h.id}/edit`)} className="font-semibold text-ink text-left hover:underline">
                      {h.hospital_name}
                    </button>
                    <div className="text-xs text-slate-soft flex items-center gap-2">
                      <span>{h.email}</span>
                      <button type="button" className="text-clinical" onClick={() => copyId(h.id)} title="Copy Clinic ID">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-soft">{h.contact_number || '—'}</td>
                  <td className="px-5 py-4"><StatusBadge status={h.status} /></td>
                  <td className="px-5 py-4 text-slate-soft">{h.activation_date || '—'}</td>
                  <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                    {h.status === 'active' ? (
                      <button className="btn-sm bg-white text-danger border border-danger" onClick={() => setStatus(h.id, 'suspended')}>Suspend</button>
                    ) : (
                      <button className="btn-sm bg-white text-signal border border-signal" onClick={() => setStatus(h.id, 'active')}>Activate</button>
                    )}
                    <button type="button" className="p-2 rounded-full bg-white text-ink border border-slate-200 hover:bg-slate-50" onClick={() => setPasswordResetTarget(h)} title="Reset Password">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4h4v-2h2l1.257-1.257A6 6 0 1118 8zm-6-4a4 4 0 100 8 4 4 0 000-8zM8 6a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button className="btn-sm bg-white text-ink border border-slate-200 hover:bg-slate-50" onClick={() => navigate(`/super-admin/hospitals/${h.id}/edit`)}>
                      Edit
                    </button>
                    <button className="btn-sm bg-white text-danger border border-danger hover:bg-danger/10" onClick={() => remove(h.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!hospitals.length && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-soft">{searchQuery || filters.state ? 'No hospitals match your criteria.' : 'No hospitals yet — add the first one.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {passwordResetTarget && (
        <ResetPasswordModal hospital={passwordResetTarget} onClose={() => setPasswordResetTarget(null)} onSave={load} />
      )}

      <Modal open={open} onClose={() => { setOpen(false); }} title="Add Hospital / Clinic">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Hospital / Clinic Name</label>
            <input className="input" value={form.hospital_name} onChange={set('hospital_name')} required />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Login Email</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input" value={form.password} onChange={set('password')}
                required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Contact Number</label>
              <input className="input" value={form.contact_number} onChange={set('contact_number')} />
            </div>
            <div>
              <label className="label">Timing</label>
              <input className="input" placeholder="09:00 AM - 08:00 PM" value={form.timing} onChange={set('timing')} />
            </div>
          </div>
          <div>
            <label className="label">Hospital Address</label>
            <input className="input" value={form.hospital_address} onChange={set('hospital_address')} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Activation Date</label>
              <input type="date" className="input" value={form.activation_date} onChange={set('activation_date')} />
            </div>
            <div>
              <label className="label">Payment Reference</label>
              <input className="input" value={form.payment_reference} onChange={set('payment_reference')} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div>
              <label className="label">Rep. Name</label>
              <input className="input" value={form.rep_name} onChange={set('rep_name')} />
            </div>
            <div>
              <label className="label">Rep. Contact</label>
              <input className="input" value={form.rep_contact_number} onChange={set('rep_contact_number')} />
            </div>
            <div>
              <label className="label">Rep. Designation</label>
              <input className="input" value={form.rep_designation} onChange={set('rep_designation')} />
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Create Hospital'}</button>
        </form>
      </Modal>
    </Layout>
  );
}
