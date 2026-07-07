import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useMemo } from 'react';
const EMPTY_FORM = {
  hospital_id: '', doctor_id: '', appointment_date: new Date().toISOString().slice(0, 10), first_name: '', last_name: '',
  patient_name: '', contact_number: '', email: '', address: '', whatsapp_available: false, timeslot: '',
};

export default function PatientBooking() {
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/public/hospitals').then((r) => setHospitals(r.data));
  }, []);

  useEffect(() => {
    if (!form.hospital_id) { setDoctors([]); return; }
    api.get(`/public/hospitals/${form.hospital_id}/doctors`, { params: { date: form.appointment_date } }).then((r) => {
      setDoctors(r.data);
      // Reset doctor if the current one is not in the new list
      if (form.doctor_id && !r.data.some(d => d.id === form.doctor_id)) {
        setForm(f => ({ ...f, doctor_id: '', timeslot: '' }));
      }
    });
  }, [form.hospital_id, form.appointment_date]);

  const availableTimeslotsForSelectedDoctor = useMemo(() => {
    if (!form.doctor_id) return [];
    const doctor = doctors.find(d => d.id === form.doctor_id);
    if (!doctor || !doctor.schedule?.is_available) return [];

    return doctor.schedule.timeslots.map(slot => {
      const { available, isFull } = slot;
      return { slot: slot.slot, available, isFull };
    });
  }, [form.doctor_id, doctors]);


  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'whatsapp_available' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/public/appointments', form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not book your token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-4">
        <div className="card max-w-sm text-center">
          <div className="text-xs uppercase tracking-wide text-slate-soft mb-2">Your Token</div>
          <div className="font-display font-bold text-6xl text-clinical">#{result.token_number}</div>
          <p className="text-slate-soft mt-3">{result.message}</p>
          <button className="btn-secondary mt-6" onClick={() => { setResult(null); setForm(EMPTY_FORM); }}>Book another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-light.svg" alt="Clinqo" className="h-9 mx-auto mb-2" />
          <h1 className="text-white/80 text-lg font-semibold">Book an Appointment Token</h1>
        </div>
        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="label">Clinic</label>
            <select className="input" value={form.hospital_id} onChange={set('hospital_id')} required>
              <option value="">Select a clinic</option>
              {hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Doctor</label>
            <select className="input" value={form.doctor_id} onChange={set('doctor_id')} required disabled={!doctors.length}>
              <option value="">Select an available doctor</option>
              {doctors.filter(d => d.schedule?.is_available).map((d) => <option key={d.id} value={d.id}>{d.doctor_name} — {d.speciality}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Appointment Date</label>
            <input type="date" className="input" value={form.appointment_date} onChange={set('appointment_date')} required />
          </div>
          <div>
            <label className="label">Timeslot</label>
            <select
              className="input"
              value={form.timeslot}
              onChange={set('timeslot')}
              required
              disabled={!form.doctor_id || availableTimeslotsForSelectedDoctor.length === 0}
            >
              <option value="">Select a timeslot</option>
              {availableTimeslotsForSelectedDoctor.map(({ slot, available, isFull }) => (
                <option key={slot} value={slot} disabled={isFull}>{slot} ({available} slot{available === 1 ? '' : 's'} left)</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.first_name} onChange={set('first_name')} required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name} onChange={set('last_name')} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone Number</label>
              <input className="input" value={form.contact_number} onChange={set('contact_number')} required />
            </div>
            <div>
              <label className="label">Email (optional)</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.whatsapp_available} onChange={set('whatsapp_available')} />
            WhatsApp available on this number
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Booking…' : 'Get My Token'}</button>
        </form>
        <p className="text-center text-white/40 text-xs mt-4">
          Clinic staff? <Link to="/login" className="underline hover:text-white">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
