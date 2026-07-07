import Layout from '../components/Layout.jsx';
import { hospitalNav } from '../navConfigs.js';

const PLANS = [
  { name: 'Basic', price: '₹999', period: 'month', features: ['Up to 5 Doctors', '1000 Tokens/month', 'Basic Support'] },
  { name: 'Pro', price: '₹1999', period: 'month', features: ['Up to 20 Doctors', '5000 Tokens/month', 'Priority Support', 'Insights & Analytics'] },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited Doctors', 'Unlimited Tokens', 'Dedicated Support', 'Custom Integrations'] },
];

export default function HospitalBilling() {
  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Billing & Subscription</h1>
        <p className="text-slate-soft">Manage your plan and payment details.</p>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold">Current Plan: Pro</h2>
        <p className="text-slate-soft">Your subscription is active and renews on {new Date('2026-08-01').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="btn-secondary">Manage Payment Methods</button>
          <button className="btn-secondary">View Invoices</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div key={plan.name} className="card p-6 flex flex-col">
            <h3 className="text-xl font-bold text-clinical">{plan.name}</h3>
            <div className="my-4">
              <span className="text-4xl font-extrabold">{plan.price}</span>
              {plan.period && <span className="text-slate-soft"> / {plan.period}</span>}
            </div>
            <ul className="space-y-2 text-sm text-slate-soft flex-grow">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span className="text-signal">✓</span> {feature}
                </li>
              ))}
            </ul>
            <button className="btn-primary w-full mt-6">{plan.name === 'Pro' ? 'Current Plan' : 'Choose Plan'}</button>
          </div>
        ))}
      </div>
    </Layout>
  );
}