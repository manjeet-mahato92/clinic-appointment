import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { doctorNav } from '../navConfigs.js';
import api from '../api/client.js';
import { STATES, LOCATIONS } from '../utils/locations.js';

export default function DoctorProfile() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    api.get('/doctor/profile').then((r) => {
      const d = r.data;
      let certifications = [];
      try {
        certifications = d.certifications ? JSON.parse(d.certifications) : [];
      } catch {
        certifications = d.certifications ? String(d.certifications).split(',').map((s) => s.trim()) : [];
      }
      if (!certifications.length) certifications = [''];
      setForm({ ...d, certifications });
    }).catch(() => setForm({ certifications: [''] }));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e?.preventDefault?.();
    const payload = { ...form, certifications: Array.isArray(form.certifications) ? form.certifications.filter(Boolean) : [] };
    if (!payload.certifications.length) payload.certifications = null;
    await api.patch('/doctor/profile', payload);
    setSaved(true);
    if (photoFile) {
      const formData = new FormData();
      formData.append('photo', photoFile);
      try {
        const { data } = await api.post('/doctor/profile/photo', formData);
        setForm(f => ({ ...f, photo_url: data.photo_url }));
      } catch (err) { console.error('Photo upload failed', err); }
    }
    setTimeout(() => setSaved(false), 2000);
  };

  if (!form) return null;

  return (
    <Layout title="Doctor" navItems={doctorNav}>
      <div className="flex flex-col gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">My Profile</h1>
          <p className="text-slate-soft">Edit your profile details shown to patients and on the display.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="card p-6 space-y-6">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.doctor_name || ''} onChange={set('doctor_name')} />
          </div>

          <div>
            <label className="label">Speciality</label>
            <input className="input" value={form.speciality || ''} onChange={set('speciality')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Contact Number</label>
              <input className="input" value={form.contact_number || ''} onChange={set('contact_number')} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={form.email || ''} onChange={set('email')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Age</label>
              <input type="text" className="input" value={form.age || ''} onChange={set('age')} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender || ''} onChange={set('gender')}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Experience (years)</label>
              <input type="number" min="0" className="input" value={form.experience_years || ''} onChange={set('experience_years')} />
            </div>
            <div />
          </div>

          <div>
            <label className="label">Degree/Certifications</label>
            <div className="space-y-2">
              {form.certifications.map((cert, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    value={cert}
                    onChange={(e) => setForm((f) => {
                      const certifications = [...f.certifications];
                      certifications[idx] = e.target.value;
                      return { ...f, certifications };
                    })}
                    placeholder={`Certification ${idx + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-sm bg-white text-danger border border-danger hover:bg-danger/10"
                    onClick={() => setForm((f) => {
                      const certifications = f.certifications.filter((_, index) => index !== idx);
                      return { ...f, certifications: certifications.length ? certifications : [''] };
                    })}
                  >
                    -
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-sm bg-white text-clinical border border-clinical hover:bg-clinical/10"
                onClick={() => setForm((f) => ({ ...f, certifications: [...f.certifications, ''] }))}
              >
                + Add degree/certification
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} className="btn-primary">Save Changes</button>
            {saved && <span className="text-signal text-sm font-medium">Saved ✓</span>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="text-sm uppercase tracking-wide text-slate-soft mb-4">Live Preview</div>
            <div className="rounded-3xl overflow-hidden border border-slate-200">
              <div className="p-5 bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-3xl bg-slate-100 overflow-hidden border border-slate-200">
                    {form.photo_url ? (
                      <img src={api.defaults.baseURL + form.photo_url} alt="Doctor" className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-slate-400">Photo</div>}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-slate-soft">Profile</div>
                    <div className="mt-2 h-10 w-full rounded-2xl shadow-sm">
                      <div className="text-lg font-semibold text-ink">{form.doctor_name || 'Doctor Name'}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="text-sm text-slate-soft">Speciality</div>
                  <div className="text-lg font-semibold text-ink">{form.speciality || 'Speciality'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-slate-50 border border-slate-200">
            <div className="text-sm font-semibold text-ink mb-3">Profile Photo</div>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} className="input text-sm" />
            <p className="text-xs text-slate-soft mt-2">Upload a new photo. Changes will be saved when you click "Save Changes".</p>
          </div>
          <div className="card p-6 bg-slate-50 border border-slate-200">
            <div className="text-sm font-semibold text-ink mb-3">Tips</div>
            <ul className="space-y-2 text-sm text-slate-soft">
              <li>Keep your speciality clear for patients.</li>
              <li>List important certifications for credibility.</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
