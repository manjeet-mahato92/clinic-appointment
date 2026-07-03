import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';

const EMPTY_FORM = {
  hospital_name: '', email: '', password: '', contact_number: '', hospital_address: '',
  timing: '', activation_date: '', payment_reference: '',
  rep_name: '', rep_contact_number: '', rep_designation: '',
};

export default function SuperAdminHospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/super-admin/hospitals').then((r) => setHospitals(r.data));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
      setError(err.response?.data?.error || 'Could not create hospital');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id, status) => {
    await api.patch(`/super-admin/hospitals/${id}/status`, { status });
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

      <div className="grid gap-4 md:grid-cols-2">
        {hospitals.map((h) => (
          <div key={h.id} className="card border border-slate-200 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate">{h.hospital_name}</div>
                <div className="text-slate-soft text-sm truncate">{h.email}</div>
              </div>
              <StatusBadge status={h.status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mt-4 text-sm text-slate-soft">
              <div>
                <div className="text-slate-900 font-medium">Contact</div>
                <div>{h.contact_number || '—'}</div>
              </div>
              <div>
                <div className="text-slate-900 font-medium">Activated</div>
                <div>{h.activation_date || '—'}</div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="text-xs font-mono text-clinical hover:underline text-left"
                onClick={() => copyId(h.id)}
              >
                {h.id}
              </button>
              <div className="flex flex-wrap gap-2">
                {h.status !== 'active' && (
                  <button className="btn-sm bg-white text-signal border border-signal" onClick={() => setStatus(h.id, 'active')}>Activate</button>
                )}
                {h.status !== 'paused' && (
                  <button className="btn-sm bg-white text-[#8A5A0C] border border-[#8A5A0C]" onClick={() => setStatus(h.id, 'paused')}>Pause</button>
                )}
                {h.status !== 'suspended' && (
                  <button className="btn-sm bg-white text-danger border border-danger" onClick={() => setStatus(h.id, 'suspended')}>Suspend</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!hospitals.length && (
          <div className="card border border-slate-200 p-8 text-center text-slate-soft">No hospitals yet — add the first one.</div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Hospital / Clinic">
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
              <input type="password" className="input" value={form.password} onChange={set('password')} required />
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
