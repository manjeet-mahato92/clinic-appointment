import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { hospitalNav } from '../navConfigs.js';
import api from '../api/client.js';

export default function HospitalBilling() {
  const [billingDetails, setBillingDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hospital/billing')
      .then(r => setBillingDetails(r.data))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (price) => price != null ? `₹${price.toLocaleString('en-IN')}` : 'Free';

  const handleChoosePlan = (plan) => {
    // In a real application, this would redirect to a payment gateway.
    alert(`Proceeding to payment for the ${plan.name}.`);
  };

  if (loading) {
    return (
      <Layout title="Hospital / Clinic" navItems={hospitalNav}>
        <div className="text-slate-soft">Loading billing information...</div>
      </Layout>
    );
  }

  const { currentPlan, availablePlans } = billingDetails;

  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Billing & Subscription</h1>
        <p className="text-slate-soft">Manage your plan and payment details.</p>
      </div>
      
      {currentPlan ? (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold">Current Plan: <span className="text-clinical">{currentPlan.name}</span></h2>
          <p className="text-slate-soft">Your subscription is active. Next renewal date will be shown here.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-secondary">Manage Payment Methods</button>
            <button className="btn-secondary">View Invoices</button>
          </div>
        </div>
      ) : (
        <div className="card p-6 mb-6 bg-amber-50 border-amber-200">
          <h2 className="text-lg font-semibold">No Active Subscription</h2>
          <p className="text-slate-soft">Please choose a plan below to activate your account features.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {availablePlans.map((plan) => (
          <div key={plan.name} className="card p-6 flex flex-col">
            <h3 className="text-xl font-bold text-clinical">{plan.name}</h3>
            <div className="my-4">
              <span className="text-4xl font-extrabold">{formatPrice(plan.price_monthly)}</span>
              <span className="text-slate-soft"> / month</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-soft flex-grow">
              <li className="flex items-center gap-2"><span className="text-signal">✓</span> {plan.max_doctors || 'Unlimited'} Doctors</li>
              <li className="flex items-center gap-2"><span className="text-signal">✓</span> {plan.max_patients || 'Unlimited'} Patients</li>
              <li className="flex items-center gap-2"><span className="text-signal">✓</span> {plan.max_tokens ? `${plan.max_tokens.toLocaleString('en-IN')} Tokens/month` : 'Unlimited Tokens'}</li>
            </ul>
            <button onClick={() => handleChoosePlan(plan)} className="btn-primary w-full mt-6" disabled={currentPlan?.id === plan.id}>
              {currentPlan?.id === plan.id ? 'Current Plan' : 'Choose Plan'}
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}