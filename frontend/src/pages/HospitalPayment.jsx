import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { hospitalNav } from '../navConfigs.js';
import api from '../api/client.js';

export default function HospitalPayment() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentReference, setPaymentReference] = useState(null);

  useEffect(() => {
    api.get('/hospital/billing')
      .then(r => {
        const selectedPlan = r.data.availablePlans.find(p => p.id === planId);
        if (selectedPlan) {
          setPlan(selectedPlan);
        } else {
          setError('The selected plan could not be found.');
        }
      })
      .catch(() => setError('Could not load plan details.'))
      .finally(() => setLoading(false));
  }, [planId]);

  const formatPrice = (price) => price != null ? `₹${price.toLocaleString('en-IN')}` : 'Free';

  const handleCashPayment = async () => {
    setProcessing(true);
    setError('');
    try {
      const { data } = await api.post('/hospital/billing/request-cash-payment', { planId });
      setPaymentReference(data.reference_number);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate payment reference.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    // In a real app, you'd integrate with a payment gateway here.
    // For now, we'll simulate a successful payment and update the hospital's plan.
    try {
      await api.patch('/hospital/profile', { subscription_plan_id: planId });
      alert('Payment successful! Your plan has been updated.');
      navigate('/hospital/billing');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while updating your plan.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Hospital / Clinic" navItems={hospitalNav}>
        <div className="text-slate-soft">Loading payment details...</div>
      </Layout>
    );
  }

  if (error || !plan) {
    return (
      <Layout title="Hospital / Clinic" navItems={hospitalNav}>
        <div className="text-danger">{error || 'Plan not found.'}</div>
        <Link to="/hospital/billing" className="btn-secondary mt-4">Back to Plans</Link>
      </Layout>
    );
  }

  if (paymentReference) {
    return (
      <Layout title="Hospital / Clinic" navItems={hospitalNav}>
        <div className="max-w-md mx-auto text-center card p-8">
          <h2 className="text-xl font-semibold">Payment Reference Generated</h2>
          <p className="text-slate-soft mt-2">Please use the following reference number for your cash payment. Your plan will be activated by the admin upon verification.</p>
          <div className="my-6 p-4 bg-slate-100 rounded-xl font-mono text-2xl font-bold text-ink">
            {paymentReference}
          </div>
          <Link to="/hospital/billing" className="btn-primary">Back to Billing</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link to="/hospital/billing" className="text-sm text-slate-soft hover:underline">← Back to Plans</Link>
          <h1 className="text-2xl font-semibold">Complete Your Payment</h1>
          <p className="text-slate-soft">You are subscribing to the <span className="font-bold text-clinical">{plan.name}</span> plan.</p>
        </div>

        <div className="grid gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold">Order Summary</h3>
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>{plan.name} (Monthly)</span>
                <span className="font-semibold">{formatPrice(plan.price_monthly)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-soft">
                <span>Taxes & Fees</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Total</span>
                <span>{formatPrice(plan.price_monthly)}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold">Choose Payment Method</h3>
            <div className="mt-4 space-y-3">
              <button type="button" onClick={handleCashPayment} className="btn-secondary w-full text-left p-4" disabled={processing}>
                <div className="font-semibold">Pay with Cash</div>
                <div className="text-sm text-slate-soft">Generate a reference number and pay at the office. Plan activation upon verification.</div>
              </button>
              <button type="button" className="btn-secondary w-full text-left p-4" disabled>
                <div className="font-semibold">Pay Online (Coming Soon)</div>
                <div className="text-sm text-slate-soft">Use a credit card, debit card, or UPI to pay instantly.</div>
              </button>
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}