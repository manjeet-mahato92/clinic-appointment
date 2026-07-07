import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { doctorNav } from '../navConfigs.js';
import api from '../api/client.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function DoctorQueue() {
  const [date] = useState(todayStr());
  const [appointments, setAppointments] = useState([]);
  const [patientView, setPatientView] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/doctor/appointments', { params: { date } }).then((r) => { setAppointments(r.data); setLoading(false); });
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [date]);

  const current = appointments.find((a) => a.status === 'in_progress');
  const upNext = appointments.filter((a) => a.status === 'scheduled').sort((a, b) => a.token_number - b.token_number);

  const clickNext = async () => {
    await api.post('/doctor/appointments/next', { date });
    load();
  };

  const complete = async (id) => {
    await api.patch(`/doctor/appointments/${id}/complete`);
    load();
  };

  const viewPatient = async (patientId) => {
    const { data } = await api.get(`/doctor/patients/${patientId}`);
    setPatientView(data);
  };

  const reschedule = async (e) => {
    e.preventDefault();
    await api.patch(`/doctor/appointments/${rescheduleTarget}/reschedule`, { new_date: newDate });
    setRescheduleTarget(null);
    setNewDate('');
    load();
  };

  const upcomingCount = useMemo(() => upNext.length, [upNext]);

  return (
    <Layout title="Doctor" navItems={doctorNav}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Today’s Queue</h1>
          <p className="text-slate-soft">{new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · Auto-refreshes.</p>
        </div>
        <button className="btn-primary" onClick={clickNext}>Click Next ▶</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
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
            <div className="text-white/70 text-sm mt-2">No one is currently being seen. Click Next to start.</div>
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
            <div className="text-slate-soft text-sm mt-2">Queue is empty.</div>
          )}
        </div>
      </div>

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
                  <td className="px-5 py-4">
                    <button className="font-medium text-ink hover:text-clinical hover:underline" onClick={() => viewPatient(a.patient_id)}>
                      {a.patient_name}
                    </button>
                  </td>
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

      <Modal open={!!patientView} onClose={() => setPatientView(null)} title="Patient Details">
        {patientView && (
          <div className="space-y-4 text-sm">
            <div>
              <div className="label">Name</div>
              <div className="text-ink font-medium">{patientView.patient_name}</div>
            </div>
            <div>
              <div className="label">Contact</div>
              <div>{patientView.contact_number}</div>
            </div>
            <div>
              <div className="label">Email</div>
              <div>{patientView.email || '—'}</div>
            </div>
            <div>
              <div className="label">Address</div>
              <div>{patientView.address || '—'}</div>
            </div>
            <div>
              <div className="label">Appointment History</div>
              <ul className="mt-2 space-y-2">
                {patientView.history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-slate-soft text-sm">
                    <span>{h.appointment_date} — Token #{h.token_number}</span>
                    <StatusBadge status={h.status} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

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
