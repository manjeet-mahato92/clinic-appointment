import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';

const EMPTY_FORM = { title: '', media_url: '', media_type: 'image', hospital_id: '' };

export default function SuperAdminBanners() {
  const [banners, setBanners] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const load = () => api.get('/super-admin/banners').then((r) => setBanners(r.data));
  useEffect(() => {
    load();
    api.get('/super-admin/hospitals').then((r) => setHospitals(r.data));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/super-admin/banners', { ...form, hospital_id: form.hospital_id || null });
      setOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create banner');
    }
  };

  const toggleActive = async (b) => {
    await api.patch(`/super-admin/banners/${b.id}`, { active: b.active ? 0 : 1 });
    load();
  };

  const remove = async (id) => {
    await api.delete(`/super-admin/banners/${id}`);
    load();
  };

  return (
    <Layout title="Super Admin" navItems={superAdminNav}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Banner Ads</h1>
          <p className="text-slate-soft">Shown on the Display Control screen. Leave clinic blank to show everywhere.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>+ Add Banner</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {banners.map((b) => (
          <div key={b.id} className="card overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex gap-4 p-4">
              <div className="h-24 w-24 overflow-hidden rounded-3xl bg-slate-100">
                <img src={b.media_url} alt={b.title} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-semibold text-ink truncate">{b.title}</div>
                <div className="text-sm text-slate-soft mt-1">
                  {b.hospital_id ? 'Single clinic' : 'All clinics'} · {b.media_type}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <button onClick={() => toggleActive(b)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-100">
                    {b.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => remove(b.id)} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-semibold text-red-700 transition hover:bg-red-100">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!banners.length && <p className="text-slate-soft">No banner ads yet.</p>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Banner Ad">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={set('title')} required />
          </div>
          <div>
            <label className="label">Media URL (image or video)</label>
            <input className="input" value={form.media_url} onChange={set('media_url')} required placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Media Type</label>
              <select className="input" value={form.media_type} onChange={set('media_type')}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="label">Restrict to Clinic (optional)</label>
              <select className="input" value={form.hospital_id} onChange={set('hospital_id')}>
                <option value="">All clinics</option>
                {hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full">Save Banner</button>
        </form>
      </Modal>
    </Layout>
  );
}
