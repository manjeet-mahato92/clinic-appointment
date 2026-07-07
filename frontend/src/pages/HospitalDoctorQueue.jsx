import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { hospitalNav } from '../navConfigs.js';
import api from '../api/client.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function HospitalDoctorQueue() {
  const { doctorId } = useParams();
  const [date] = useState(todayStr());
  const [appointments, setAppointments] = useState([]);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/hospital/appointments', { params: { date, doctor_id: doctorId } }).then((r) => { setAppointments(r.data); setLoading(false); });
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [date, doctorId]);

  const current = appointments.find((a) => a.status === 'in_progress');
  const upNext = appointments.filter((a) => a.status === 'scheduled').sort((a, b) => a.token_number - b.token_number);
  const doctorLabel = appointments[0]?.doctor_name || 'Doctor';

  const clickNext = async () => {
    setError('');
    try {
      await api.post('/hospital/appointments/next', { doctor_id: doctorId, date });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not advance queue');
    }
  };

  const complete = async (id) => {
    setError('');
    try {
      await api.patch(`/hospital/appointments/${id}/status`, { status: 'completed' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not close appointment');
    }
  };

  const reschedule = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.patch(`/hospital/appointments/${rescheduleTarget}/reschedule`, { new_date: newDate });
      setRescheduleTarget(null);
      setNewDate('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reschedule appointment');
    }
  };

  const upcomingCount = useMemo(() => upNext.length, [upNext]);

  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{doctorLabel}’s Queue</h1>
          <p className="text-slate-soft">{new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · Receptionist queue control.</p>
        </div>
        <button className="btn-primary" onClick={clickNext}>Click Next ▶</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <div className="card p-5 bg-ink text-white">
          <div className="text-xs uppercase tracking-wide text-white/60 mb-3">Current Appointment</div>
          {current ? (
            <>
              <div className="text-5xl font-bold">#{current.token_number}</div>
              <div className="mt-2 text-white/80 text-lg">{current.patient_name}</div>
              <button onClick={() => complete(current.id)} className="mt-6 btn bg-signal text-white hover:bg-[#2c7b61] text-sm">
                Close Appointment ✓
              </button>
            </>
          ) : (
            <div className="text-white/70 text-sm mt-2">No appointment is currently in progress. Click Next to start the queue.</div>
          )}
        </div>

        <div className="card p-5">
          <div className="text-xs uppercase tracking-wide text-slate-soft mb-3">Next Up</div>
          {upNext[0] ? (
            <>
              <div className="text-5xl font-bold text-clinical">#{upNext[0].token_number}</div>
              <div className="mt-2 text-slate-700 text-lg">{upNext[0].patient_name}</div>
              <div className="mt-4 text-slate-soft text-sm">{upcomingCount} patient{upcomingCount === 1 ? '' : 's'} waiting</div>
            </>
          ) : (
            <div className="text-slate-soft text-sm mt-2">No scheduled tokens left for today.</div>
          )}
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper text-slate-soft text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Token</th>
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {appointments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono font-bold text-ink">#{a.token_number}</td>
                  <td className="px-5 py-4 text-ink">{a.patient_name}</td>
                  <td className="px-5 py-4"><StatusBadge status={a.status} /></td>
                  <td className="px-5 py-4 text-right space-x-2">
                    {a.status === 'scheduled' && (
                      <button
                        className="btn-sm bg-slate-100 text-ink hover:bg-slate-200"
                        onClick={() => { setRescheduleTarget(a.id); setNewDate(date); }}
                      >
                        Reschedule
                      </button>
                    )}
                    {a.status === 'scheduled' && (
                      <button className="btn-sm bg-white text-danger border border-danger hover:bg-danger/10" onClick={() => complete(a.id)}>
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!appointments.length && (
                <tr>
                  <td colSpan={4} className="text-center px-5 py-10 text-slate-soft">No tokens booked for today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!rescheduleTarget} onClose={() => setRescheduleTarget(null)} title="Reschedule Appointment">
        <form onSubmit={reschedule} className="space-y-4">
          <div>
            <label className="label">New Date</label>
            <input type="date" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
          </div>
          <button className="btn-primary w-full" type="submit">Confirm Reschedule</button>
        </form>
      </Modal>
    </Layout>
  );
}
