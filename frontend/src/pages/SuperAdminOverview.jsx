import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis, Legend,
} from 'recharts';

const StatCard = ({ icon, label, value, loading }) => (
  <div className="card p-5 flex items-start gap-4">
    <div className="text-3xl">{icon}</div>
    <div>
      <div className="text-3xl font-semibold text-ink">{loading ? '…' : value}</div>
      <div className="text-sm text-slate-soft mt-1">{label}</div>
    </div>
  </div>
);

const PIE_CHART_COLORS = ['#16a34a', '#dc2626'];

export default function SuperAdminOverview() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/super-admin/summary')
      .then(r => setSummary(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Super Admin" navItems={superAdminNav}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Platform Overview</h1>
          <p className="text-slate-soft">A high-level summary of all activity on the platform.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate('/super-admin/hospitals?new=true')} className="btn-primary">
            + Add Hospital
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard icon="⛨" label="Total Hospitals" value={summary?.totalHospitals ?? 0} loading={loading} />
        <StatCard icon="⚕️" label="Total Doctors" value={summary?.totalDoctors ?? 0} loading={loading} />
        <StatCard icon="👥" label="Total Patients" value={summary?.totalPatients ?? 0} loading={loading} />
        <StatCard icon="📅" label="Today's Appointments" value={summary?.todaysAppointments ?? 0} loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5 mt-6">
        <div className="lg:col-span-3 card p-5">
          <h3 className="font-semibold text-ink mb-4">New Hospital Registrations</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={loading ? [] : summary?.hospitalGrowth || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="new_hospitals" name="New Hospitals" stroke="#0284c7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 card p-5">
          <h3 className="font-semibold text-ink mb-4">Hospital Status Breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={loading ? [] : summary?.hospitalStatusBreakdown || []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={5}
                >
                  {(summary?.hospitalStatusBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5 mt-6">
        <h3 className="font-semibold text-ink mb-4">Top Hospitals by Doctor Count</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={loading ? [] : summary?.topHospitalsByDoctors || []}
              margin={{ top: 10, right: 20, left: 80, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="hospital_name"
                width={150}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Bar dataKey="doctor_count" name="Doctors" fill="#0f172a" radius={[0, 6, 6, 0]} barSize={20}>
                {(summary?.topHospitalsByDoctors || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#0f172a" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  );
}