import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { hospitalNav } from '../navConfigs.js';
import api from '../api/client.js';
import ActionDropdown from '../components/ActionDropdown.jsx';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function HospitalAppointments() {
  const [date, setDate] = useState(todayStr());
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchParams] = useSearchParams();
  const [filtersVisible, setFiltersVisible] = useState(true);

  const [bookOpen, setBookOpen] = useState(false);
  const [bookForm, setBookForm] = useState({ doctor_id: '', patient_id: '', timeslot: '' });
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTimeslot, setNewTimeslot] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    const params = { date };
    if (doctorFilter) params.doctor_id = doctorFilter;
    api.get('/hospital/appointments', { params }).then((r) => setAppointments(r.data));
  };

  useEffect(() => {
    load();
    api.get('/hospital/doctors', { params: { date } }).then((r) => setDoctors(r.data));
    api.get('/hospital/patients').then((r) => setPatients(r.data));
  }, [date, doctorFilter]);

  useEffect(() => {
    const patientId = searchParams.get('patient_id');
    if (patientId) {
      setBookForm((f) => ({ ...f, patient_id: patientId }));
      setBookOpen(true);
    }
  }, [searchParams]);

  const closeBookingModal = () => {
    setBookOpen(false);
    setPatientSearch('');
    setError('');
  };

  const bookToken = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/hospital/appointments', { ...bookForm, appointment_date: date });
      closeBookingModal();
      setBookForm({ doctor_id: '', patient_id: '', timeslot: '' });
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
    await api.patch(`/hospital/appointments/${rescheduleTarget}/reschedule`, { new_date: newDate, timeslot: newTimeslot });
    setRescheduleTarget(null);
    setNewDate('');
    setNewTimeslot('');
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

  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    filtered.sort((a, b) => {
      if (sortOrder === 'asc') return a.token_number - b.token_number;
      return b.token_number - a.token_number;
    });

    return filtered;
  }, [appointments, statusFilter, sortOrder]);

  const availableTimeslotsForSelectedDoctor = useMemo(() => {
    if (!bookForm.doctor_id) return [];
    const doctor = doctors.find(d => d.id === bookForm.doctor_id);
    if (!doctor || !doctor.schedule?.is_available) return [];

    const maxPerSlot = Math.floor(60 / (doctor.avg_minutes_per_patient || 15));

    return doctor.schedule.timeslots.map(slot => {
      const bookedCount = appointments.filter(a => a.doctor_id === doctor.id && a.timeslot === slot && a.status !== 'cancelled').length;
      const available = maxPerSlot - bookedCount;
      return { slot, available, isFull: available <= 0 };
    });
  }, [bookForm.doctor_id, doctors, appointments]);

  const availableTimeslotsForReschedule = useMemo(() => {
    if (!rescheduleTarget || !newDate) return [];
    const appointmentToReschedule = appointments.find(a => a.id === rescheduleTarget);
    if (!appointmentToReschedule) return [];

    const doctor = doctors.find(d => d.id === appointmentToReschedule.doctor_id);
    if (!doctor || !doctor.schedule?.is_available) return [];

    const maxPerSlot = Math.floor(60 / (doctor.avg_minutes_per_patient || 15));
    return doctor.schedule.timeslots.map(slot => {
      const bookedCount = appointments.filter(a => a.doctor_id === doctor.id && a.appointment_date === newDate && a.timeslot === slot && a.status !== 'cancelled').length;
      const available = maxPerSlot - bookedCount;
      return { slot, available, isFull: available <= 0 };
    });
  }, [rescheduleTarget, newDate, appointments, doctors]);

  const patientSearchResults = useMemo(() => {
    if (!patientSearch) return [];
    const lowerQuery = patientSearch.toLowerCase();
    return patients.filter(p =>
      p.patient_name.toLowerCase().includes(lowerQuery) ||
      p.contact_number.includes(lowerQuery)
    ).slice(0, 5);
  }, [patientSearch, patients]);

  const handleSelectPatient = (patient) => {
    setBookForm(f => ({ ...f, patient_id: patient.id }));
    setPatientSearch('');
  };
  const selectedPatientForBooking = useMemo(() => patients.find(p => p.id === bookForm.patient_id), [bookForm.patient_id, patients]);

  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Reception Dashboard</h1>
          <p className="text-slate-soft">Manage appointments, queue status, and patient actions for today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary" type="button" onClick={() => window.open('/display/select-doctor', '_blank')}>
            Open Display
          </button>
          <button className="btn-primary" onClick={() => setBookOpen(true)}>+ Book Token</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard icon="🗓️" label="Scheduled" value={summary.scheduled} />
        <StatCard icon="🏃" label="In Progress" value={summary.inProgress} />
        <StatCard icon="✅" label="Completed" value={summary.completed} />
        <StatCard icon="❌" label="Cancelled" value={summary.cancelled} />
      </div>

      <div className="card mb-6">
        <div className="p-4 flex justify-between items-center border-b border-slate-100">
          <h3 className="font-semibold text-ink">Filters</h3>
          <button
            type="button"
            onClick={() => setFiltersVisible(!filtersVisible)}
            className="text-sm font-semibold text-clinical hover:underline"
          >
            {filtersVisible ? 'Hide' : 'Show'}
          </button>
        </div>
        {filtersVisible && (
          <div className="p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <label className="label text-xs">Date</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="label text-xs">Doctor</label>
              <select className="input" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
                <option value="">All doctors</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.doctor_name} — {d.speciality || 'General'}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="label text-xs">Status</label>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="scheduled">Upcoming</option>
                <option value="in_progress">Running</option>
                <option value="completed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn-secondary text-sm w-full" onClick={() => { setDate(todayStr()); setDoctorFilter(''); setStatusFilter('all'); }}>Reset Filters</button>
            </div>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper text-slate-soft text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Token</th>
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Doctor</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Timeslot</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredAppointments.map((a) => {
                const actions = [
                  { label: 'Print Token', href: `/hospital/appointments/${a.id}/print`, target: '_blank' },
                ];
                if (a.whatsapp_available === 1) {
                  actions.push({ label: 'WhatsApp Patient', href: whatsappLink(a.patient_contact, a.patient_name), target: '_blank' });
                }
                if (a.status === 'scheduled') {
                  actions.push({ label: 'Reschedule', onClick: () => { setRescheduleTarget(a.id); setNewDate(date); } });
                }
                if (a.status !== 'cancelled' && a.status !== 'completed') {
                  actions.push({ label: 'Cancel Appointment', onClick: () => cancel(a.id), isDanger: true });
                }

                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 align-top font-mono font-bold text-ink">#{a.token_number}</td>
                    <td className="px-5 py-4 align-top">
                      <div className="font-medium text-ink">{a.patient_first_name} {a.patient_last_name}</div>
                      <div className="text-slate-soft text-xs mt-1">{a.patient_contact}</div>
                    </td>
                    <td className="px-5 py-4 align-top text-slate-soft">{a.doctor_name}</td>
                    <td className="px-5 py-4 align-top"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-4 align-top text-slate-soft">{a.timeslot || '—'}</td>
                    <td className="px-5 py-4 align-top text-right">
                      <ActionDropdown items={actions} />
                    </td>
                  </tr>
                );
              })}
              {!filteredAppointments.length && (
                <tr>
                  <td colSpan={6} className="text-center px-5 py-10 text-slate-soft">
                    No tokens for this date yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={bookOpen}
        onClose={closeBookingModal}
        title={`Book Token for ${new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}`}
      >
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
              {doctors.filter(d => d.schedule?.is_available).map((d) => (
                <option key={d.id} value={d.id}>{d.doctor_name} — {d.speciality || 'General'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Timeslot</label>
            <select
              className="input"
              value={bookForm.timeslot}
              onChange={(e) => setBookForm((f) => ({ ...f, timeslot: e.target.value }))}
              required
              disabled={!bookForm.doctor_id || availableTimeslotsForSelectedDoctor.length === 0}
            >
              <option value="">Select a timeslot</option>
              {availableTimeslotsForSelectedDoctor.map(({ slot, available, isFull }) => (
                <option key={slot} value={slot} disabled={isFull}>
                  {slot} ({available} slot{available === 1 ? '' : 's'} left)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Patient</label>
            {selectedPatientForBooking ? (
              <div className="flex items-center justify-between rounded-lg bg-slate-100 p-3">
                <div className="font-medium text-ink">{selectedPatientForBooking.patient_name}</div>
                <button type="button" onClick={() => setBookForm(f => ({ ...f, patient_id: '' }))} className="text-sm text-clinical hover:underline">Change</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  className="input"
                  placeholder="Search by name or phone..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
                {patientSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {patientSearchResults.map(p => (
                      <button key={p.id} type="button" onClick={() => handleSelectPatient(p)} className="block w-full text-left px-4 py-2 text-sm text-ink hover:bg-slate-50">
                        {p.patient_name} <span className="text-slate-soft ml-2">{p.contact_number}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-soft">No patient yet? Add them first from the Patients tab.</p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full" type="submit">Generate Token</button>
        </form>
      </Modal>

      <Modal open={!!rescheduleTarget} onClose={() => { setRescheduleTarget(null); setNewTimeslot(''); }} title="Reschedule Appointment">
        <form onSubmit={reschedule} className="space-y-4">
          <div>
            <label className="label">New Date</label>
            <input type="date" className="input" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">New Timeslot</label>
            <select
              className="input"
              value={newTimeslot}
              onChange={(e) => setNewTimeslot(e.target.value)}
              required
              disabled={!newDate || availableTimeslotsForReschedule.length === 0}
            >
              <option value="">Select a timeslot</option>
              {availableTimeslotsForReschedule.map(({ slot, available, isFull }) => (
                <option key={slot} value={slot} disabled={isFull}>
                  {slot} ({available} slot{available === 1 ? '' : 's'} left)
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary w-full" type="submit">Confirm Reschedule</button>
        </form>
      </Modal>

    </Layout>
  );
}

const StatCard = ({ icon, label, value }) => (
  <div className="card p-5 flex items-start gap-4">
    <div className="text-3xl">{icon}</div>
    <div>
      <div className="text-3xl font-semibold text-ink">{value}</div>
      <div className="text-sm text-slate-soft mt-1">{label}</div>
    </div>
  </div>
);
