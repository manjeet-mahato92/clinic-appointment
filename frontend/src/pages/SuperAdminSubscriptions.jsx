import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';

const EMPTY_FORM = {
  name: '',
  max_doctors: '',
  max_patients: '',
  max_tokens: '',
  price_monthly: '',
};

export default function SuperAdminSubscriptions() {
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/super-admin/subscription-plans').then((r) => setPlans(r.data));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openModal = (plan) => {
    if (plan) {
      setEditingPlan(plan);
      setForm(plan);
    } else {
      setEditingPlan(null);
      setForm(EMPTY_FORM);
    }
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });

      if (editingPlan) {
        await api.patch(`/super-admin/subscription-plans/${editingPlan.id}`, payload);
      } else {
        await api.post('/super-admin/subscription-plans', payload);
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save plan');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    await api.delete(`/super-admin/subscription-plans/${id}`);
    load();
  };

  const formatPrice = (price) => price ? `₹${price.toLocaleString('en-IN')}` : '—';

  return (
    <Layout title="Super Admin" navItems={superAdminNav}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Subscription Plans</h1>
          <p className="text-slate-soft">Create and manage subscription tiers for clinics.</p>
        </div>
        <button className="btn-primary" onClick={() => openModal(null)}>+ New Plan</button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className="card p-5 flex flex-col">
            <h3 className="text-xl font-bold text-clinical">{plan.name}</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-soft border-t border-b border-slate-100 py-4">
              <div className="flex justify-between"><span>Max Doctors:</span> <span className="font-semibold text-ink">{plan.max_doctors || 'Unlimited'}</span></div>
              <div className="flex justify-between"><span>Max Patients:</span> <span className="font-semibold text-ink">{plan.max_patients || 'Unlimited'}</span></div>
              <div className="flex justify-between"><span>Monthly Tokens:</span> <span className="font-semibold text-ink">{plan.max_tokens || 'Unlimited'}</span></div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-soft flex-grow">
              <div className="flex justify-between"><span>Monthly:</span> <span className="font-semibold text-ink">{formatPrice(plan.price_monthly)}</span></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => openModal(plan)} className="btn-secondary flex-1">Edit</button>
              <button onClick={() => remove(plan.id)} className="btn-secondary text-danger border-danger hover:bg-danger/10">Delete</button>
            </div>
          </div>
        ))}
        {!plans.length && <p className="text-slate-soft">No subscription plans created yet.</p>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editingPlan ? 'Edit Plan' : 'Create New Plan'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Plan Name</label>
            <input className="input" value={form.name} onChange={set('name')} required placeholder="e.g., Pro Plan" />
          </div>

          <fieldset className="card p-4">
            <legend className="label -mb-2">Features / Limitations</legend>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label text-xs">Max Doctors</label>
                <input type="number" className="input" value={form.max_doctors} onChange={set('max_doctors')} placeholder="Unlimited" />
              </div>
              <div>
                <label className="label text-xs">Max Patients</label>
                <input type="number" className="input" value={form.max_patients} onChange={set('max_patients')} placeholder="Unlimited" />
              </div>
              <div>
                <label className="label text-xs">Max Tokens / mo</label>
                <input type="number" className="input" value={form.max_tokens} onChange={set('max_tokens')} placeholder="Unlimited" />
              </div>
            </div>
          </fieldset>

          <fieldset className="card p-4">
            <legend className="label -mb-2">Pricing (₹)</legend>
            <div>
              <label className="label text-xs">Price (Monthly)</label>
              <input type="number" className="input" value={form.price_monthly} onChange={set('price_monthly')} placeholder="e.g., 999" />
            </div>
          </fieldset>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving...' : (editingPlan ? 'Save Changes' : 'Create Plan')}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
