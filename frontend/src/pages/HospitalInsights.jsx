import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { hospitalNav } from '../navConfigs.js';
import api from '../api/client.js';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

const formatDate = (date) => date.toISOString().slice(0, 10);
const today = () => formatDate(new Date());
const yesterday = () => formatDate(new Date(Date.now() - 86400000));
const weekAgo = () => formatDate(new Date(Date.now() - 6 * 86400000));
const monthStart = () => {
  const dt = new Date();
  dt.setDate(1);
  return formatDate(dt);
};
const yearStart = () => {
  const dt = new Date();
  dt.setMonth(0, 1);
  return formatDate(dt);
};

const presets = [
  { label: 'Today', getRange: () => ({ startDate: today(), endDate: today() }) },
  { label: 'Yesterday', getRange: () => ({ startDate: yesterday(), endDate: yesterday() }) },
  { label: 'Weekly', getRange: () => ({ startDate: weekAgo(), endDate: today() }) },
  { label: 'Monthly', getRange: () => ({ startDate: monthStart(), endDate: today() }) },
  { label: 'Yearly', getRange: () => ({ startDate: yearStart(), endDate: today() }) },
];

export default function HospitalInsights() {
  const [rangeLabel, setRangeLabel] = useState('Today');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/hospital/insights', {
        params: { start_date: startDate, end_date: endDate },
      });
      setInsights(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInsights(); }, [startDate, endDate]);

  const activePreset = useMemo(() => {
    return presets.find((preset) => {
      const range = preset.getRange();
      return range.startDate === startDate && range.endDate === endDate;
    })?.label || 'Custom';
  }, [startDate, endDate]);

  const applyPreset = (preset) => {
    const range = preset.getRange();
    setRangeLabel(preset.label);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Reception Insights</h1>
          <p className="text-slate-soft">Quick clinic statistics for appointments, doctors, and patients. Use presets or a custom date range.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`btn-sm ${activePreset === preset.label ? 'bg-clinical text-white' : 'bg-white text-ink border border-slate-200 hover:bg-slate-50'}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div className="space-y-2">
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="label">End Date</label>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
            <div className="text-slate-soft text-sm">Showing</div>
            <div className="text-ink font-semibold">{startDate} → {endDate}</div>
            <div className="text-slate-soft text-xs">Preset: {activePreset}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wide text-slate-soft mb-2">Total Appointments</div>
          <div className="text-3xl font-semibold text-ink">{loading ? '…' : insights?.totalAppointments ?? 0}</div>
          <div className="text-slate-soft text-sm mt-2">Appointments in selected range</div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wide text-slate-soft mb-2">Total Doctors</div>
          <div className="text-3xl font-semibold text-ink">{loading ? '…' : insights?.doctorCount ?? 0}</div>
          <div className="text-slate-soft text-sm mt-2">Active doctors in your clinic</div>
        </div>
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wide text-slate-soft mb-2">Total Patients</div>
          <div className="text-3xl font-semibold text-ink">{loading ? '…' : insights?.patientCount ?? 0}</div>
          <div className="text-slate-soft text-sm mt-2">Registered patients in your clinic</div>
        </div>
      </div>

      <div className="grid gap-4 mt-4 md:grid-cols-4">
        <div className="card p-5">
          <div className="text-sm uppercase tracking-wide text-slate-soft mb-2">Scheduled</div>
          <div className="text-2xl font-semibold text-ink">{loading ? '…' : insights?.scheduledAppointments ?? 0}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm uppercase tracking-wide text-slate-soft mb-2">In Progress</div>
          <div className="text-2xl font-semibold text-ink">{loading ? '…' : insights?.inProgressAppointments ?? 0}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm uppercase tracking-wide text-slate-soft mb-2">Completed</div>
          <div className="text-2xl font-semibold text-ink">{loading ? '…' : insights?.completedAppointments ?? 0}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm uppercase tracking-wide text-slate-soft mb-2">Cancelled</div>
          <div className="text-2xl font-semibold text-ink">{loading ? '…' : insights?.cancelledAppointments ?? 0}</div>
        </div>
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="text-sm uppercase tracking-wide text-slate-soft mb-3">Daily Appointment Trend</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={loading ? [] : insights?.dailyAppointments || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)' }} />
                <Area type="monotone" dataKey="appointments" stroke="#0f172a" fillOpacity={1} fill="url(#colorAppointments)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm uppercase tracking-wide text-slate-soft mb-3">Status Breakdown</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={loading ? [] : insights?.statusBreakdown || []} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                  <Cell fill="#0f172a" />
                  <Cell fill="#2563eb" />
                  <Cell fill="#0ea5e9" />
                  <Cell fill="#e11d48" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <div className="text-sm uppercase tracking-wide text-slate-soft mb-3">Doctor Workload</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={loading ? [] : insights?.doctorWorkload || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="doctor" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)' }} />
              <Bar dataKey="count" fill="#0f172a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  );
}
