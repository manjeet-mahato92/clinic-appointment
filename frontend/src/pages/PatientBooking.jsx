import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

const EMPTY_FORM = {
  hospital_id: '',
  doctor_id: '',
  appointment_date: new Date().toISOString().slice(0, 10),
  timeslot: '',
  first_name: '',
  last_name: '',
  contact_number: '',
  email: '',
  address: '',
  whatsapp_available: true, // Default to true
};

export default function PatientBooking() {
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    api.get('/public/hospitals').then((r) => setHospitals(r.data));
  }, []);

  useEffect(() => {
    if (!form.hospital_id) {
      setDoctors([]);
      return;
    }
    setLoading(true);
    api.get(`/public/hospitals/${form.hospital_id}/doctors`, { params: { date: form.appointment_date } })
      .then((r) => {
        setDoctors(r.data);
        if (form.doctor_id && !r.data.some(d => d.id === form.doctor_id)) {
          setForm(f => ({ ...f, doctor_id: '', timeslot: '' }));
        }
      })
      .finally(() => setLoading(false));
  }, [form.hospital_id, form.appointment_date]);

  const selectedHospital = useMemo(() => hospitals.find(h => h.id === form.hospital_id), [hospitals, form.hospital_id]);
  const selectedDoctor = useMemo(() => doctors.find(d => d.id === form.doctor_id), [doctors, form.doctor_id]);

  const availableTimeslots = useMemo(() => {
    if (!selectedDoctor || !selectedDoctor.schedule?.is_available || !Array.isArray(selectedDoctor.schedule.timeslots)) return [];

    // The backend now sends timeslots as an array of objects with availability info.
    // We just need to use that directly.
    return selectedDoctor.schedule.timeslots.map(slotInfo => ({
      slot: slotInfo.slot,
      isFull: slotInfo.isFull,
      available: slotInfo.available,
    }));
  }, [selectedDoctor]);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <img src="/logo-dark.svg" alt="Clinqo" className="h-10 mx-auto mb-2" />
          </div>
          <div className="card p-8">
            <div className="text-signal text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-ink">Booking Confirmed!</h2>
            <p className="text-slate-soft mt-2">Your appointment token is ready.</p>
            <div className="bg-paper rounded-lg p-6 my-6">
              <div className="text-sm uppercase tracking-wider text-slate-soft">Your Token Number</div>
              <div className="font-bold text-7xl text-clinical my-2">#{result.token_number}</div>
              <div className="text-sm text-slate-soft">{result.message}</div>
            </div>
            <button
              className="btn-secondary w-full"
              onClick={() => {
                setResult(null);
                setForm(EMPTY_FORM);
                setStep(1);
              }}
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-dark.svg" alt="Clinqo" className="h-10 mx-auto mb-2" />
          <h1 className="text-ink text-2xl font-bold">Book an Appointment Token</h1>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-6">
          {/* Step 1: Clinic and Doctor Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2 mb-4">Step 1: Choose Appointment</h3>
              <div>
                <label className="label">Clinic</label>
                <select className="input" value={form.hospital_id} onChange={set('hospital_id')} required>
                  <option value="">Select a clinic</option>
                  {hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
                </select>
              </div>
              {selectedHospital && (
                <div className="p-3 bg-slate-100 rounded-lg text-sm">
                  <p className="font-semibold">{selectedHospital.hospital_name}</p>
                  <p className="text-slate-soft">{selectedHospital.hospital_address}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Appointment Date</label>
                  <input type="date" className="input" value={form.appointment_date} onChange={set('appointment_date')} required min={new Date().toISOString().slice(0, 10)} />
                </div>
                <div>
                  <label className="label">Doctor</label>
                  <select className="input" value={form.doctor_id} onChange={(e) => setForm(f => ({ ...f, doctor_id: e.target.value, timeslot: '' }))} required disabled={!doctors.length || loading}>
                    <option value="">{loading ? 'Loading...' : 'Select a doctor'}</option>
                    {doctors.filter(d => d.schedule?.is_available).map((d) => <option key={d.id} value={d.id}>{d.doctor_name} — {d.speciality}</option>)}
                  </select>
                </div>
              </div>

              {form.doctor_id && (
                <div>
                  <label className="label">Available Timeslots</label>
                  {availableTimeslots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableTimeslots.map(({ slot, isFull, available }) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => !isFull && setForm(f => ({ ...f, timeslot: slot }))}
                          disabled={isFull}
                          className={`p-2 text-xs font-semibold rounded-md text-center transition-colors ${form.timeslot === slot ? 'bg-clinical text-white' : 'bg-slate-100 text-ink hover:bg-slate-200'} ${isFull ? 'bg-slate-50 text-slate-400 line-through cursor-not-allowed' : ''}`}
                        >
                          {slot} ({available} left)
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-slate-soft p-4 bg-slate-50 rounded-md">
                      No timeslots available for this doctor on the selected date.
                    </div>
                  )}
                </div>
              )}

              <button type="button" className="btn-primary w-full" onClick={() => setStep(2)} disabled={!form.hospital_id || !form.doctor_id || !form.timeslot}>
                Next: Your Details
              </button>
            </div>
          )}

          {/* Step 2: Patient Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 mb-4">
                <h3 className="font-semibold text-lg">Step 2: Your Details</h3>
                <button type="button" onClick={() => setStep(1)} className="text-sm text-clinical hover:underline">← Back</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input className="input" value={form.first_name} onChange={set('first_name')} required />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input className="input" value={form.last_name} onChange={set('last_name')} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone Number</label>
                  <input className="input" value={form.contact_number} onChange={set('contact_number')} required />
                </div>
                <div>
                  <label className="label">Email (optional)</label>
                  <input type="email" className="input" value={form.email} onChange={set('email')} />
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-md text-sm">
                <input type="checkbox" className="h-4 w-4" checked={form.whatsapp_available} onChange={set('whatsapp_available')} />
                I am available on WhatsApp for appointment updates.
              </label>

              {error && <p className="text-sm text-danger" role="alert">{error}</p>}

              <button className="btn-primary w-full" disabled={loading}>
                {loading ? 'Booking Your Token…' : 'Get My Token'}
              </button>
            </div>
          )}
        </form>

        <p className="text-center text-slate-soft text-sm mt-6">
          Clinic staff? <Link to="/login" className="underline hover:text-white">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
