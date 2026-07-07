import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis, Legend,
} from 'recharts';

const STAT_CARDS = [
  { key: 'totalHospitals', label: 'Total Hospitals', accent: 'text-ink' },
  { key: 'activeHospitals', label: 'Active', accent: 'text-signal' },
  { key: 'suspendedHospitals', label: 'Suspended', accent: 'text-danger' },
  { key: 'totalDoctors', label: 'Total Doctors', accent: 'text-ink' },
  { key: 'totalPatients', label: 'Total Patients', accent: 'text-ink' },
  { key: 'todaysAppointments', label: 'Today’s Tokens', accent: 'text-clinical' },
];

const PIE_COLORS = ['#16a34a', '#dc2626', '#f97316', '#2563eb'];

export default function SuperAdminOverview() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/super-admin/summary')
      .then((r) => setSummary(r.data))
      .finally(() => setLoading(false));
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
            <div className={`font-display font-bold text-3xl ${c.accent}`}>{loading ? '…' : (summary?.[c.key] ?? 0)}</div>
            <div className="text-sm text-slate-soft mt-2">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 mt-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-sm uppercase tracking-wide text-slate-soft mb-3">Hospital Status</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={loading ? [] : summary?.hospitalStatusBreakdown || []} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                  {(summary?.hospitalStatusBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-sm uppercase tracking-wide text-slate-soft mb-3">New Hospital Growth</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={loading ? [] : summary?.hospitalGrowth || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} allowDecimals={false} />
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)' }} />
                <Area type="monotone" dataKey="new_hospitals" name="New Hospitals" stroke="#0f172a" fillOpacity={1} fill="url(#colorGrowth)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5 mt-6">
        <h3 className="text-sm uppercase tracking-wide text-slate-soft mb-3">Top Hospitals by Doctor Count</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={loading ? [] : summary?.topHospitalsByDoctors || []}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} allowDecimals={false} />
              <YAxis type="category" dataKey="hospital_name" width={150} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)' }} />
              <Bar dataKey="doctor_count" name="Doctors" fill="#0f172a" radius={[0, 8, 8, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  );
}
