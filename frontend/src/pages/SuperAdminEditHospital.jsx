import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/Layout.jsx';
import { superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';
import { STATES, LOCATIONS } from '../utils/locations.js';

export default function SuperAdminEditHospital() {
  const { hospitalId } = useParams();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState([]);
  const { loginWithToken } = useAuth();

  useEffect(() => {
    api.get(`/super-admin/hospitals/${hospitalId}`).then((r) => setForm(r.data));
    api.get('/super-admin/subscription-plans').then((r) => setPlans(r.data));
  }, [hospitalId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openDisplay = async () => {
    // This will open in the same tab, which is more robust for auth.
    window.open('/display/select-doctor', '_blank');
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await api.patch(`/super-admin/hospitals/${hospitalId}`, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save changes.');
    }
  };

  if (!form) return <Layout title="Super Admin" navItems={superAdminNav}>Loading...</Layout>;

  return (
    <Layout title="Super Admin" navItems={superAdminNav}>
      <div className="flex flex-col gap-2 mb-6">
        <div>
          <Link to="/super-admin/hospitals" className="text-sm text-slate-soft hover:underline">← Back to Hospitals</Link>
          <h1 className="text-2xl font-semibold">Edit Hospital: {form.hospital_name}</h1>
          <p className="text-slate-soft">Manage all details for this clinic, including branding and credentials.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={`/super-admin/hospitals/${hospitalId}/doctors`} className="btn-secondary">View Doctors</Link>
          <Link to={`/super-admin/hospitals/${hospitalId}/patients`} className="btn-secondary">View Patients</Link>
          <button type="button" onClick={openDisplay} className="btn-secondary">Open Display</button>
        </div>
      </div>

      <form onSubmit={save}>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="card p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Clinic Name</label>
                <input className="input" value={form.hospital_name || ''} onChange={set('hospital_name')} />
              </div>
              <div>
                <label className="label">Contact Number</label>
                <input className="input" value={form.contact_number || ''} onChange={set('contact_number')} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Login Email</label>
                <input type="email" className="input" value={form.email || ''} onChange={set('email')} />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  value={form.password || ''}
                  onChange={set('password')}
                  placeholder="Leave blank to keep current"
                />
              </div>
            </div>

            <div>
              <label className="label">Timing</label>
              <input className="input" value={form.timing || ''} onChange={set('timing')} />
            </div>

            <div>
              <label className="label">Hospital Address</label>
              <input className="input" value={form.hospital_address || ''} onChange={set('hospital_address')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Logo URL</label>
                <input className="input" value={form.logo_url || ''} onChange={set('logo_url')} />
              </div>
              <div>
                <label className="label">Banner URL</label>
                <input className="input" value={form.banner_url || ''} onChange={set('banner_url')} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] items-end">
              <div>
                <label className="label">Header Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="w-16 h-12 rounded-xl border border-slate-200 p-0"
                    value={form.header_color || '#111827'}
                    onChange={set('header_color')}
                  />
                  <div>
                    <div className="text-slate-soft text-sm">Brand accent</div>
                    <div className="text-ink text-sm">{form.header_color || '#111827'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-ink mb-4">Representative Details</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Rep. Name</label>
                  <input className="input" value={form.rep_name || ''} onChange={set('rep_name')} />
                </div>
                <div>
                  <label className="label">Rep. Contact</label>
                  <input className="input" value={form.rep_contact_number || ''} onChange={set('rep_contact_number')} />
                </div>
                <div>
                  <label className="label">Rep. Designation</label>
                  <input className="input" value={form.rep_designation || ''} onChange={set('rep_designation')} />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-ink mb-4">Subscription</h3>
              <div>
                <label className="label">Assigned Plan</label>
                <select className="input" value={form.subscription_plan_id || ''} onChange={set('subscription_plan_id')}>
                  <option value="">No Plan Assigned</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name} ({formatPrice(plan.price_monthly)}/month)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold text-ink mb-4">Location Details</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">State</label>
                  <select className="input" value={form.state || ''} onChange={(e) => setForm(f => ({ ...f, state: e.target.value, district: '' }))}>
                    <option value="">Select state</option>
                    {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">District</label>
                  <select className="input" value={form.district || ''} onChange={set('district')} disabled={!form.state}>
                    <option value="">Select district</option>
                    {form.state && LOCATIONS[form.state] && LOCATIONS[form.state].map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Pincode</label>
                  <input type="text" className="input" value={form.pincode || ''} onChange={set('pincode')} maxLength={6} placeholder="6 digits" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-primary">Save Changes</button>
              {saved && <span className="text-signal text-sm font-medium">Saved ✓</span>}
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <div className="font-semibold text-slate-900 mb-2">Clinic ID</div>
              <div className="font-mono text-ink break-all">{form.id}</div>
              <div className="mt-2 text-sm text-slate-soft">Used for Display Control login and public booking URL.</div>
              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="font-semibold text-slate-900 mb-2">Account Activation Date</div>
                <div className="text-ink">{form.activation_date ? new Date(form.activation_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</div>
              </div>
            </div>

            <div className="card p-6">
              <div className="text-sm uppercase tracking-wide text-slate-soft mb-4">Live Preview</div>
              <div className="rounded-3xl overflow-hidden border border-slate-200">
                {form.banner_url ? (
                  <img src={form.banner_url} alt="Banner preview" className="w-full h-44 object-cover" />
                ) : (
                  <div className="w-full h-44 bg-slate-100 flex items-center justify-center text-slate-400">Banner preview</div>
                )}
                <div className="p-5 bg-white">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-slate-100 overflow-hidden border border-slate-200">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">Logo</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-slate-soft">Header background</div>
                      <div className="mt-2 h-10 w-full rounded-2xl shadow-sm" style={{ backgroundColor: form.header_color || '#111827' }} />
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="text-sm text-slate-soft">Clinic name</div>
                    <div className="text-lg font-semibold text-ink">{form.hospital_name || 'Clinic / Hospital Name'}</div>
                    <div className="mt-2 text-slate-soft text-sm">{form.timing || 'Clinic timing'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
}

const formatPrice = (price) => price ? `₹${price.toLocaleString('en-IN')}` : 'Free';