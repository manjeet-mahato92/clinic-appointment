import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client.js';

export default function PrintableInvoice() {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/hospital/invoices/${invoiceId}`)
      .then(r => {
        setInvoice(r.data);
        setTimeout(() => window.print(), 500); // Allow time for render
      })
      .catch(err => setError(err.response?.data?.error || 'Could not load invoice details.'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const formatPrice = (price) => price != null ? `₹${price.toLocaleString('en-IN')}` : '—';

  if (loading) {
    return <div className="p-10 text-center">Loading invoice...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  if (!invoice) return null;

  return (
    <div className="p-10" style={{ width: '8.5in', fontFamily: 'sans-serif' }}>
      <header className="flex justify-between items-start pb-6 border-b-2 border-black">
        <div>
          <h1 className="text-3xl font-bold">{invoice.hospital_name}</h1>
          <p className="text-sm text-gray-600">{invoice.hospital_address}</p>
        </div>
        <h2 className="text-4xl font-bold text-gray-400 uppercase tracking-widest">Invoice</h2>
      </header>

      <main className="mt-8">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="text-sm text-gray-500">Billed To</div>
            <div className="font-bold">{invoice.hospital_name}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Invoice Number</div>
            <div className="font-bold">{invoice.reference_number}</div>
            <div className="text-sm text-gray-500 mt-2">Date of Issue</div>
            <div className="font-bold">{new Date(invoice.verified_at).toLocaleDateString()}</div>
          </div>
        </div>

        <table className="w-full mt-10 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3 font-bold uppercase text-gray-600">Description</th>
              <th className="text-right p-3 font-bold uppercase text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-3">Subscription: {invoice.plan_name} (Monthly)</td>
              <td className="text-right p-3">{formatPrice(invoice.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-right mt-4">
          <div className="text-lg font-bold">Total: {formatPrice(invoice.amount)}</div>
        </div>
      </main>

      <footer className="mt-20 pt-6 border-t text-center text-sm text-gray-500">
        <p>Thank you for your business!</p>
        <p>{invoice.hospital_name}</p>
      </footer>
    </div>
  );
}