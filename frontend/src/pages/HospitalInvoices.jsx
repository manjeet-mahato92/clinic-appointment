import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { hospitalNav } from '../navConfigs.js';
import api from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function HospitalInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hospital/invoices')
      .then(r => setInvoices(r.data))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (price) => price != null ? `₹${price.toLocaleString('en-IN')}` : '—';

  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="mb-6">
        <Link to="/hospital/billing" className="text-sm text-slate-soft hover:underline">← Back to Billing</Link>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <p className="text-slate-soft">Your payment history.</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper text-slate-soft text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Invoice Date</th>
                <th className="text-left px-5 py-3">Plan</th>
                <th className="text-left px-5 py-3">Reference #</th>
                <th className="text-left px-5 py-3">Amount</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={6} className="text-center py-10 text-slate-soft">Loading invoices...</td></tr>}
              {!loading && invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-ink">{new Date(invoice.verified_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-slate-soft">{invoice.plan_name}</td>
                  <td className="px-5 py-4 font-mono text-slate-soft">{invoice.reference_number}</td>
                  <td className="px-5 py-4 font-semibold text-ink">{formatPrice(invoice.amount)}</td>
                  <td className="px-5 py-4"><StatusBadge status={invoice.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <Link to={`/hospital/invoices/${invoice.id}/print`} target="_blank" className="btn-sm bg-white text-ink border border-slate-200 hover:bg-slate-50">
                      View & Print
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && !invoices.length && <tr><td colSpan={6} className="text-center py-10 text-slate-soft">No invoices found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}