import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';

export default function SuperAdminCashPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/super-admin/cash-payments')
      .then(r => setPayments(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleConfirmVerification = async () => {
    if (!verifyingPaymentId) return;
    try {
      await api.post(`/super-admin/cash-payments/${verifyingPaymentId}/verify`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not verify payment.');
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  const formatPrice = (price) => price != null ? `₹${price.toLocaleString('en-IN')}` : '—';

  return (
    <Layout title="Super Admin" navItems={superAdminNav}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Cash Payment Requests</h1>
        <p className="text-slate-soft">Verify cash payments to activate hospital subscription plans.</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper text-slate-soft text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Reference #</th>
                <th className="text-left px-5 py-3">Hospital</th>
                <th className="text-left px-5 py-3">Plan</th>
                <th className="text-left px-5 py-3">Amount</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={6} className="text-center py-10 text-slate-soft">Loading payments...</td></tr>}
              {!loading && payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono font-semibold">{p.reference_number}</td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-ink">{p.hospital_name}</div>
                    <div className="text-xs text-slate-soft">{new Date(p.created_at).toLocaleString()}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-soft">{p.plan_name}</td>
                  <td className="px-5 py-4 font-semibold text-ink">{formatPrice(p.amount)}</td>
                  <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-4 text-right">
                    {p.status === 'pending' && (
                      <button onClick={() => setVerifyingPaymentId(p.id)} className="btn-sm bg-signal text-white">
                        Verify & Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && !payments.length && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-soft">No cash payment requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        open={!!verifyingPaymentId}
        title="Confirm Payment Verification"
        message="Are you sure you have received the cash payment? This will activate the subscription for the hospital."
        confirmText="Yes, Verify & Activate"
        confirmClass="btn-primary bg-signal hover:bg-signal/90"
        onConfirm={handleConfirmVerification}
        onCancel={() => setVerifyingPaymentId(null)}
      />
    </Layout>
  );
}