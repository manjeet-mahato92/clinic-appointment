import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';

const STAT_CARDS = [
  { key: 'totalHospitals', label: 'Total Hospitals', accent: 'text-ink' },
  { key: 'activeHospitals', label: 'Active', accent: 'text-signal' },
  { key: 'pausedHospitals', label: 'Paused', accent: 'text-[#8A5A0C]' },
  { key: 'suspendedHospitals', label: 'Suspended', accent: 'text-danger' },
  { key: 'totalDoctors', label: 'Total Doctors', accent: 'text-ink' },
  { key: 'totalPatients', label: 'Total Patients', accent: 'text-ink' },
  { key: 'todaysAppointments', label: 'Today’s Tokens', accent: 'text-clinical' },
];

export default function SuperAdminOverview() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/super-admin/summary').then((r) => setSummary(r.data));
  }, []);

  return (
    <Layout title="Super Admin" navItems={superAdminNav}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Platform Overview</h1>
        <p className="text-slate-soft">Snapshot across every registered hospital and clinic.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((c) => (
          <div key={c.key} className="card border border-slate-200 p-5">
            <div className={`font-display font-bold text-3xl ${c.accent}`}>
              {summary ? summary[c.key] : '—'}
            </div>
            <div className="text-sm text-slate-soft mt-2">{c.label}</div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
