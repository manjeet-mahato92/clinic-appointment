import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { hospitalNav } from '../navConfigs.js';
import api from '../api/client.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
const thirtyDaysAgo = () => formatDate(new Date(Date.now() - 29 * 86400000));
const monthStart = () => {
  const dt = new Date();
  dt.setDate(1);
  return formatDate(dt);
};

const presets = [
  { label: 'Today', getRange: () => ({ startDate: today(), endDate: today() }) },
  { label: 'Yesterday', getRange: () => ({ startDate: yesterday(), endDate: yesterday() }) },
  { label: 'Last 7 Days', getRange: () => ({ startDate: weekAgo(), endDate: today() }) },
  { label: 'Last 30 Days', getRange: () => ({ startDate: thirtyDaysAgo(), endDate: today() }) },
  { label: 'This Month', getRange: () => ({ startDate: monthStart(), endDate: today() }) },
];

export default function HospitalInsights() {
  const [rangeLabel, setRangeLabel] = useState('Today');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    let yPos = 15;

    pdf.setFontSize(20);
    pdf.text('Hospital Insights Report', pdfWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    pdf.setFontSize(12);
    pdf.text(`For the period: ${startDate} to ${endDate}`, pdfWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    const addCanvasToPdf = (canvas, x, y, width, height) => {
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', x, y, width, height);
    };

    // 1. Stats Cards (Full Width)
    const statsEl = document.getElementById('stats-cards');
    if (statsEl) {
      const canvas = await html2canvas(statsEl, { backgroundColor: '#ffffff' });
      const imgWidth = pdfWidth - 30;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      addCanvasToPdf(canvas, 15, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 15;
    }

    // 2. Chart Pairs (Side-by-Side)
    const chartPairs = [
      ['daily-trend-chart', 'status-breakdown-chart'],
      ['doctor-workload-chart', 'timeslot-distribution-chart'],
      ['patient-growth-chart', null], // Handle single chart
    ];

    for (const pair of chartPairs) {
      const el1 = document.getElementById(pair[0]);
      const el2 = pair[1] ? document.getElementById(pair[1]) : null;
      if (!el1) continue;

      const canvas1 = await html2canvas(el1, { backgroundColor: '#ffffff' });
      const imgWidth = el2 ? (pdfWidth - 40) / 2 : pdfWidth - 30;
      const imgHeight = (canvas1.height * imgWidth) / canvas1.width;

      if (yPos + imgHeight > pdfHeight - 15) {
        pdf.addPage();
        yPos = 15;
      }

      addCanvasToPdf(canvas1, 15, yPos, imgWidth, imgHeight);

      if (el2) {
        const canvas2 = await html2canvas(el2, { backgroundColor: '#ffffff' });
        addCanvasToPdf(canvas2, 15 + imgWidth + 10, yPos, imgWidth, (canvas2.height * imgWidth) / canvas2.width);
      }

      yPos += imgHeight + 15;
    }

    pdf.save(`hospital-insights-${startDate}-to-${endDate}.pdf`);
    setExporting(false);
  };

  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Reception Insights</h1>
          <p className="text-slate-soft">View clinic statistics for appointments, doctors, and patients.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg bg-white border border-slate-200 text-sm">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${activePreset === preset.label ? 'bg-clinical text-white' : 'text-slate-soft hover:bg-slate-100'}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2"> 
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button onClick={handleExport} className="btn-secondary w-fit" disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export'}
          </button>
          </div>
        
        </div>
      </div>

      <div id="stats-cards" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="📅" label="Total Appointments" value={insights?.totalAppointments ?? 0} loading={loading} />
        <StatCard icon="✅" label="Completed" value={insights?.completedAppointments ?? 0} loading={loading} />
        <StatCard icon="⚕️" label="Total Doctors" value={insights?.doctorCount ?? 0} loading={loading} />
        <StatCard icon="👥" label="Total Patients" value={insights?.patientCount ?? 0} loading={loading} />
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-2">
        <div id="daily-trend-chart" className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Daily Appointment Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={loading ? [] : insights?.dailyAppointments || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPatientGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="appointments" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorAppointments)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div id="status-breakdown-chart" className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Status Breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={loading ? [] : insights?.statusBreakdown || []} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                  <Cell fill="#0284c7" /> {/* Scheduled */}
                  <Cell fill="#f97316" /> {/* In Progress */}
                  <Cell fill="#16a34a" /> {/* Completed */}
                  <Cell fill="#dc2626" /> {/* Cancelled */}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-2">
        <div id="doctor-workload-chart" className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Doctor Workload</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={loading ? [] : insights?.doctorWorkload || []}
                margin={{ top: 10, right: 20, left: 80, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} allowDecimals={false} />
                <YAxis type="category" dataKey="doctor" width={150} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#0f172a" radius={[0, 6, 6, 0]} barSize={20}>
                  {(insights?.doctorWorkload || []).map((entry, index) => <Cell key={`cell-${index}`} fill="#0f172a" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div id="timeslot-distribution-chart" className="card p-5">
          <h3 className="font-semibold text-ink mb-4">Appointments by Timeslot</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loading ? [] : insights?.timeslotDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="timeslot" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div id="patient-growth-chart" className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-ink mb-4">New Patient Registrations</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={loading ? [] : insights?.patientGrowth || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="count" name="New Patients" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorPatientGrowth)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const StatCard = ({ icon, label, value, loading }) => (
  <div className="card p-5 flex items-start gap-4">
    <div className="text-3xl">{icon}</div>
    <div>
      <div className="text-3xl font-semibold text-ink">{loading ? '…' : value}</div>
      <div className="text-sm text-slate-soft mt-1">{label}</div>
    </div>
  </div>
);
