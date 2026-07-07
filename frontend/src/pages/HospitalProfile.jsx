import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { hospitalNav } from '../navConfigs.js';
import api from '../api/client.js';
import { STATES, LOCATIONS } from '../utils/locations.js';

export default function HospitalProfile() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/hospital/profile').then((r) => setForm(r.data));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const { hospital_name, contact_number, hospital_address, timing, logo_url, banner_url, header_color, rep_name, rep_contact_number, rep_designation, rep_age, rep_gender, district, state, pincode } = form;
    await api.patch('/hospital/profile', { hospital_name, contact_number, hospital_address, timing, logo_url, banner_url, header_color, rep_name, rep_contact_number, rep_designation, rep_age, rep_gender, district, state, pincode });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!form) return null;

  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="flex flex-col gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Clinic Profile</h1>
          <p className="text-slate-soft">Manage how your clinic appears on the public display and booking screens.</p>
        </div>
      </div>

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
            <div>
              <label className="label">Rep. Name</label>
              <input className="input" value={form.rep_name || ''} onChange={set('rep_name')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Rep. Contact</label>
              <input className="input" value={form.rep_contact_number || ''} onChange={set('rep_contact_number')} />
            </div>
            <div>
              <label className="label">Rep. Designation</label>
              <input className="input" value={form.rep_designation || ''} onChange={set('rep_designation')} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Rep. Age</label>
              <input type="text" className="input" value={form.rep_age || ''} onChange={set('rep_age')} />
            </div>
            <div>
              <label className="label">Rep. Gender</label>
              <select className="input" value={form.rep_gender || ''} onChange={set('rep_gender')}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">District</label>
              <select className="input" value={form.district || ''} onChange={set('district')}>
                <option value="">Select district</option>
                {(LOCATIONS[form.state] || []).map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">State</label>
              <select className="input" value={form.state || ''} onChange={set('state')}>
                <option value="">Select state</option>
                {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pincode</label>
              <input type="text" className="input" value={form.pincode || ''} onChange={set('pincode')} maxLength={6} placeholder="6 digits" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} className="btn-primary">Save Changes</button>
            {saved && <span className="text-signal text-sm font-medium">Saved ✓</span>}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-soft">
            <div className="font-semibold text-slate-900 mb-2">Clinic ID</div>
            <div className="font-mono text-ink break-all">{form.id}</div>
            <div className="mt-2">Use this ID for Display Control login and clinic sharing.</div>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="font-semibold text-slate-900 mb-2">Account Activation Date</div>
              <div className="text-ink">{form.activation_date ? new Date(form.activation_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</div>
              <div className="mt-2">This is the date your clinic account was activated.</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
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

          <div className="card p-6 bg-slate-50 border border-slate-200">
            <div className="text-sm font-semibold text-ink mb-3">Tips for display</div>
            <ul className="space-y-2 text-sm text-slate-soft">
              <li>Keep the banner image clear and simple for easy recognition.</li>
              <li>Use a square logo with a transparent or neutral background.</li>
              <li>Share the Clinic ID with staff who operate the display board.</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
