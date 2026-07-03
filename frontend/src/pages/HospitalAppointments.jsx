import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { hospitalNav } from '../navConfigs.js';
import api from '../api/client.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function HospitalAppointments() {
  const [date, setDate] = useState(todayStr());
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctorFilter, setDoctorFilter] = useState('');
  const [searchParams] = useSearchParams();

  const [bookOpen, setBookOpen] = useState(false);
  const [bookForm, setBookForm] = useState({ doctor_id: '', patient_id: '' });
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    const params = { date };
    if (doctorFilter) params.doctor_id = doctorFilter;
    api.get('/hospital/appointments', { params }).then((r) => setAppointments(r.data));
  };

  useEffect(() => { load(); }, [date, doctorFilter]);

  useEffect(() => {
    api.get('/hospital/doctors').then((r) => setDoctors(r.data));
    api.get('/hospital/patients').then((r) => setPatients(r.data));
  }, []);

  useEffect(() => {
    const patientId = searchParams.get('patient_id');
    if (patientId) {
      setBookForm((f) => ({ ...f, patient_id: patientId }));
      setBookOpen(true);
    }
  }, [searchParams]);

  const bookToken = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/hospital/appointments', { ...bookForm, appointment_date: date });
      setBookOpen(false);
      setBookForm({ doctor_id: '', patient_id: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not book token');
    }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this token? Remaining tokens for the day will auto-renumber.')) return;
    await api.patch(`/hospital/appointments/${id}/cancel`);
    load();
  };

  const reschedule = async (e) => {
    e.preventDefault();
    await api.patch(`/hospital/appointments/${rescheduleTarget}/reschedule`, { new_date: newDate });
    setRescheduleTarget(null);
    setNewDate('');
    load();
  };

  const whatsappLink = (phone, name) =>
    `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi ${name}, this is regarding your clinic appointment.`)}`;
  const summary = useMemo(() => ({
    scheduled: appointments.filter((a) => a.status === 'scheduled').length,
    inProgress: appointments.filter((a) => a.status === 'in_progress').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  }), [appointments]);

  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="flex flex-col gap-6 mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Reception Dashboard</h1>
            <p className="text-slate-soft mt-1">Manage today’s appointments, queue status, and quick patient actions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={() => window.open('/display/select-doctor', '_blank')}>
              Open Display
            </button>
            <button className="btn-primary" onClick={() => setBookOpen(true)}>+ Book Token</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide text-slate-soft mb-2">Scheduled</div>
            <div className="text-3xl font-semibold text-ink">{summary.scheduled}</div>
            <div className="text-slate-soft text-sm mt-2">Tokens waiting for service today.</div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide text-slate-soft mb-2">In Progress</div>
            <div className="text-3xl font-semibold text-ink">{summary.inProgress}</div>
            <div className="text-slate-soft text-sm mt-2">Patients currently being served.</div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide text-slate-soft mb-2">Completed</div>
            <div className="text-3xl font-semibold text-ink">{summary.completed}</div>
            <div className="text-slate-soft text-sm mt-2">Tokens closed today.</div>
          </div>
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide text-slate-soft mb-2">Cancelled</div>
            <div className="text-3xl font-semibold text-ink">{summary.cancelled}</div>
            <div className="text-slate-soft text-sm mt-2">Tokens removed from today’s queue.</div>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="grid gap-4 md:grid-cols-[minmax(220px,1fr)_220px]">
          <div className="space-y-2">
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="label">Doctor</label>
            <select className="input" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
              <option value="">All doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.doctor_name} — {d.speciality || 'General'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper text-slate-soft text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Token</th>
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Doctor</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {appointments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 align-top font-mono font-bold text-ink">#{a.token_number}</td>
                  <td className="px-5 py-4 align-top">
                    <div className="font-medium text-ink">{a.patient_name}</div>
                    <div className="text-slate-soft text-xs mt-1">{a.patient_contact}</div>
                  </td>
                  <td className="px-5 py-4 align-top text-slate-soft">{a.doctor_name}</td>
                  <td className="px-5 py-4 align-top"><StatusBadge status={a.status} /></td>
                  <td className="px-5 py-4 align-top text-right flex flex-wrap justify-end gap-2">
                    {a.whatsapp_available === 1 && (
                      <a
                        href={whatsappLink(a.patient_contact, a.patient_name)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-sm bg-white text-clinical border border-clinical hover:bg-clinical/10"
                      >
                        WhatsApp
                      </a>
                    )}
                    {a.status === 'scheduled' && (
                      <button
                        type="button"
                        className="btn-sm bg-slate-100 text-ink hover:bg-slate-200"
                        onClick={() => { setRescheduleTarget(a.id); setNewDate(date); }}
                      >
                        Reschedule
                      </button>
                    )}
                    {a.status !== 'cancelled' && a.status !== 'completed' && (
                      <button
                        type="button"
                        className="btn-sm bg-white text-danger border border-danger hover:bg-danger/10"
                        onClick={() => cancel(a.id)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!appointments.length && (
                <tr>
                  <td colSpan={5} className="text-center px-5 py-10 text-slate-soft">
                    No tokens for this date yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={bookOpen} onClose={() => setBookOpen(false)} title={`Book Token for ${date}`}>
        <form onSubmit={bookToken} className="space-y-4">
          <div>
            <label className="label">Doctor</label>
            <select
              className="input"
              value={bookForm.doctor_id}
              onChange={(e) => setBookForm((f) => ({ ...f, doctor_id: e.target.value }))}
              required
            >
              <option value="">Select a doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.doctor_name} — {d.speciality || 'General'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Patient</label>
            <select
              className="input"
              value={bookForm.patient_id}
              onChange={(e) => setBookForm((f) => ({ ...f, patient_id: e.target.value }))}
              required
            >
              <option value="">Select a patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.patient_name} — {p.contact_number}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-soft">No patient yet? Add them first from the Patients tab.</p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full" type="submit">Generate Token</button>
        </form>
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
