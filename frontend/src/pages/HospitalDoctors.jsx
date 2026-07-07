import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { hospitalNav, superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { STATES, LOCATIONS } from '../utils/locations.js';

const EMPTY_FORM = {
  first_name: '', last_name: '', speciality: '', contact_number: '', email: '', password: '', avg_minutes_per_patient: 15,
  age: '', gender: '', district: '', state: '', pincode: '',
  experience_years: '', certifications: [''],
};

const TIME_SLOTS = [
  '01:00AM - 02:00AM', '02:00AM - 03:00AM', '03:00AM - 04:00AM', '05:00AM - 06:00AM',
  '06:00AM - 07:00AM', '07:00AM - 08:00AM', '09:00AM - 10:00AM', '10:00AM - 11:00AM',
  '11:00AM - 12:00PM', '12:00PM - 01:00PM', '01:00PM - 02:00PM', '02:00PM - 03:00PM',
  '03:00PM - 04:00PM', '04:00PM - 05:00PM', '05:00PM - 06:00PM', '06:00PM - 07:00PM',
  '07:00PM - 08:00PM', '09:00PM - 10:00PM', '10:00PM - 11:00PM', '11:00PM - 12:00AM',
  '12:00AM - 01:00AM'
];

const localDateString = () => {
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localNow.toISOString().slice(0, 10);
};

const ScheduleModal = ({ doctor, onClose, onSave }) => {
  const [isAvailable, setIsAvailable] = useState(doctor.schedule?.is_available || false);
  const [timeslots, setTimeslots] = useState(doctor.schedule?.timeslots || []);
  const [roomNumber, setRoomNumber] = useState(doctor.schedule?.room_number || '');
  const [isLate, setIsLate] = useState((doctor.schedule?.delay_minutes || 0) > 0);
  const [delayMinutes, setDelayMinutes] = useState(doctor.schedule?.delay_minutes || 30);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (isAvailable && !roomNumber.trim()) {
      setError('Room number is required when the doctor is available.');
      return;
    }
    const parsedDelay = Number(delayMinutes);
    if (isAvailable && isLate && (!Number.isInteger(parsedDelay) || parsedDelay < 1 || parsedDelay > 1440)) {
      setError('Delay must be a whole number between 1 and 1440 minutes.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.post(`/hospital/doctors/${doctor.id}/schedule`, {
        date: localDateString(),
        is_available: isAvailable,
        timeslots: isAvailable ? timeslots : [],
        room_number: isAvailable ? roomNumber.trim() : '',
        delay_minutes: isAvailable && isLate ? parsedDelay : 0,
      });
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the schedule.');
    } finally {
      setSaving(false);
    }
  };

  const addTimeslot = (slot) => !timeslots.includes(slot) && setTimeslots([...timeslots, slot].sort());
  const removeTimeslot = (slot) => setTimeslots(timeslots.filter(t => t !== slot));

  return (
    <Modal open={true} onClose={onClose} title={`Schedule for ${doctor.doctor_name}`}>
      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          Available on {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </label>
        {isAvailable && (
          <>
            <div>
              <label className="label">Room Number</label>
              <input
                className="input"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 23 or OPD-4"
                maxLength={20}
                required
              />
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <label className="flex items-center gap-2 font-semibold text-amber-950">
                <input
                  type="checkbox"
                  checked={isLate}
                  onChange={(e) => setIsLate(e.target.checked)}
                />
                Doctor is running late
              </label>
              {isLate && (
                <div className="mt-3">
                  <label className="label">Delay in minutes</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="1440"
                    step="1"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(e.target.value)}
                    required
                  />
                  <p className="mt-2 text-sm font-semibold text-amber-800">
                    Display message: Doctor is late by {delayMinutes || 0} Minutes
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="label">Add Timeslot</label>
              <select className="input mb-3" onChange={e => e.target.value && addTimeslot(e.target.value)} value="">
                <option value="">Select a timeslot</option>
                {TIME_SLOTS.filter(ts => !timeslots.includes(ts)).map(ts => <option key={ts} value={ts}>{ts}</option>)}
              </select>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {timeslots.map(slot => (
                  <div key={slot} className="flex items-center justify-between rounded-lg bg-slate-50 p-2">
                    <span className="text-sm font-medium">{slot}</span>
                    <button type="button" onClick={() => removeTimeslot(slot)} className="text-danger text-xs">Remove</button>
                  </div>
                ))}
                {!timeslots.length && <p className="text-xs text-slate-400 text-center py-2">No timeslots added.</p>}
              </div>
            </div>
          </>
        )}
        {error && <p className="text-danger text-sm" role="alert">{error}</p>}
        <button type="button" onClick={handleSave} className="btn-primary w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save Schedule'}
        </button>
      </div>
    </Modal>
  );
};

const BulkScheduleModal = ({ doctors, onClose, onSave }) => {
  const [selectedDoctorIds, setSelectedDoctorIds] = useState([]);
  const [selectedTimeslots, setSelectedTimeslots] = useState([]);
  const [roomNumbers, setRoomNumbers] = useState({});
  const [date, setDate] = useState(localDateString());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDoctorToggle = (doctorId) => {
    setSelectedDoctorIds(prev =>
      prev.includes(doctorId) ? prev.filter(id => id !== doctorId) : [...prev, doctorId]
    );
  };

  const handleTimeslotToggle = (slot) => {
    setSelectedTimeslots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const handleSelectAllDoctors = (e) => {
    if (e.target.checked) {
      setSelectedDoctorIds(doctors.map(d => d.id));
    } else {
      setSelectedDoctorIds([]);
    }
  };

  const handleSave = async () => {
    if (selectedDoctorIds.length === 0 || selectedTimeslots.length === 0) {
      setError('Select at least one doctor and one timeslot.');
      return;
    }
    if (selectedDoctorIds.some((doctorId) => !String(roomNumbers[doctorId] || '').trim())) {
      setError('Enter a room number for every selected doctor.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.post('/hospital/doctors/bulk-schedule', {
        doctor_ids: selectedDoctorIds,
        date,
        timeslots: selectedTimeslots,
        room_numbers: roomNumbers,
      });
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not apply the schedules.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Bulk Schedule Doctors">
      <div className="space-y-4">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="card p-3 space-y-2 max-h-40 overflow-y-auto">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={doctors.length > 0 && selectedDoctorIds.length === doctors.length}
              onChange={handleSelectAllDoctors}
            />
            Select All Doctors
          </label>
          {doctors.map(d => (
            <div key={d.id} className="grid grid-cols-[1fr_120px] items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedDoctorIds.includes(d.id)} onChange={() => handleDoctorToggle(d.id)} />
                <span className="truncate">{d.doctor_name}</span>
              </label>
              {selectedDoctorIds.includes(d.id) && (
                <input
                  className="input py-1"
                  value={roomNumbers[d.id] || ''}
                  onChange={(e) => setRoomNumbers((rooms) => ({ ...rooms, [d.id]: e.target.value }))}
                  placeholder="Room"
                  maxLength={20}
                  aria-label={`Room number for ${d.doctor_name}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="card p-3 space-y-1 max-h-48 overflow-y-auto">
          <p className="label">Timeslots to Add</p>
          {TIME_SLOTS.map(slot => (
            <label key={slot} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedTimeslots.includes(slot)} onChange={() => handleTimeslotToggle(slot)} /> {slot}</label>
          ))}
        </div>
        {error && <p className="text-danger text-sm" role="alert">{error}</p>}
        <button type="button" onClick={handleSave} className="btn-primary w-full" disabled={saving}>
          {saving ? 'Applying…' : 'Apply Schedule'}
        </button>
      </div>
    </Modal>
  );
};

const ChangePasswordModal = ({ doctor, onClose, onSave }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!password) {
      setError('Password cannot be empty.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const url = user.role === 'super_admin' ? `/super-admin/hospitals/${hospitalId}/doctors/${doctor.id}` : `/hospital/doctors/${doctor.id}`;
      await api.patch(url, { password });
      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Change Password for Dr. ${doctor.doctor_name}`}>
      <div className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" required />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <button onClick={handleSave} className="btn-primary w-full" disabled={saving}>{saving ? 'Saving...' : 'Save New Password'}</button>
      </div>
    </Modal>
  );
};

export default function HospitalDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [scheduleDoctor, setScheduleDoctor] = useState(null);
  const [bulkScheduleOpen, setBulkScheduleOpen] = useState(false);
  const [passwordChangeDoctor, setPasswordChangeDoctor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { hospitalId } = useParams();

  const navigate = useNavigate();
  const load = () => {
    const date = new URLSearchParams(window.location.search).get('date') || localDateString();
    const url = user.role === 'super_admin'
      ? `/super-admin/hospitals/${hospitalId}/doctors`
      : '/hospital/doctors';

    api.get(url, { params: { date } }).then((r) => setDoctors(r.data.map((doctor) => ({
      ...doctor,
      certifications: parseCertifications(doctor.certifications),
    }))));
  };
  useEffect(() => { load(); }, [user.role, hospitalId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'age' || k === 'pincode' ? e.target.value.replace(/[^\d]/g, '') : e.target.value }));

  const parseCertifications = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [String(parsed).trim()].filter(Boolean);
    } catch {
      return String(value).split(',').map((item) => item.trim()).filter(Boolean);
    }
  };

  const normalizeCertifications = (certifications) => {
    const list = Array.isArray(certifications) ? certifications : typeof certifications === 'string' ? parseCertifications(certifications) : [];
    return list.length ? list : [''];
  };

  const openDoctorModal = (doctor) => {
    if (doctor) {
      setEditingDoctor(doctor.id);
      setForm({
        first_name: doctor.first_name || '',
        last_name: doctor.last_name || '',
        speciality: doctor.speciality || '',
        contact_number: doctor.contact_number || '',
        email: doctor.email || '',
        password: '',
        avg_minutes_per_patient: doctor.avg_minutes_per_patient || 15,
        age: doctor.age || '',
        gender: doctor.gender || '',
        district: doctor.district || '',
        state: doctor.state || '',
        pincode: doctor.pincode || '',
        experience_years: doctor.experience_years || '',
        certifications: normalizeCertifications(doctor.certifications),
      });
      setOpen(true);
      return;
    }
    setEditingDoctor(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      certifications: form.certifications.filter((cert) => String(cert).trim()),
      experience_years: form.experience_years || null,
    };
    if (!payload.certifications.length) payload.certifications = null;
    try {
      const url = user.role === 'super_admin' ? `/super-admin/hospitals/${hospitalId}/doctors` : '/hospital/doctors';
      if (editingDoctor) {
        await api.patch(`${url}/${editingDoctor}`, payload);
      } else {
        await api.post(url, payload);
      }
      setOpen(false);
      setEditingDoctor(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save doctor');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this doctor? Their appointments will also be removed.')) return;
    const url = user.role === 'super_admin' ? `/super-admin/hospitals/${hospitalId}/doctors/${id}` : `/hospital/doctors/${id}`;
    await api.delete(url);
    load();
  };

  const goToQueue = (id) => navigate(`/hospital/doctor/${id}/queue`);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const filteredDoctors = useMemo(() => {
    if (!searchQuery) {
      return doctors;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return doctors.filter(doctor =>
      doctor.doctor_name.toLowerCase().includes(lowerCaseQuery) ||
      (doctor.speciality || '').toLowerCase().includes(lowerCaseQuery)
    );
  }, [doctors, searchQuery]);

  const navItems = user.role === 'super_admin' ? superAdminNav : hospitalNav;
  const layoutTitle = user.role === 'super_admin' ? 'Super Admin' : 'Hospital / Clinic';

  return (
    <Layout title={layoutTitle} navItems={navItems}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        {user.role === 'super_admin' && (
          <Link to={`/super-admin/hospitals/${hospitalId}/edit`} className="text-sm text-slate-soft hover:underline absolute top-6">← Back to Hospital</Link>
        )}
        <div>
          <h1 className="text-2xl font-semibold">Doctors</h1>
          <p className="text-slate-soft">Manage doctors, edit their details, and quickly open their queue.</p>
        </div>
        <div className="text-right">
          <div className="font-semibold">{today}</div>
          <p className="text-slate-soft text-sm">Manage daily doctor availability and timeslots.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setBulkScheduleOpen(true)}>Bulk Schedule</button>
          <button className="btn-primary" onClick={() => openDoctorModal(null)}>+ Add Doctor</button>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          className="input w-full max-w-md"
          placeholder="Search doctors by name or speciality..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredDoctors.map((d) => (
          <div key={d.id} className="card border border-slate-200 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-clinical flex-shrink-0 flex items-center justify-center font-bold text-white overflow-hidden">
                {d.photo_url ? (
                  <img src={`${new URL(api.defaults.baseURL).origin}${d.photo_url}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{d.first_name?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openDoctorModal(d)}
                    className="text-xl font-semibold text-ink hover:text-clinical text-left"
                  >
                    Dr. {d.first_name} {d.last_name}
                  </button>
                  <button type="button" onClick={() => remove(d.id)} className="text-danger hover:bg-danger/10 p-2 rounded-full shrink-0" aria-label="Delete doctor">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="mt-1 text-sm text-slate-soft">{d.speciality || 'General clinic'}</div>
                <div className="mt-2">
                  <StatusBadge status={d.status} />
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-slate-soft text-xs uppercase tracking-wide">Email</div>
                  <div className="font-medium text-ink break-words">{d.email || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-soft text-xs uppercase tracking-wide">Contact</div>
                  <div>{d.contact_number || '—'}</div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-slate-soft text-xs uppercase tracking-wide">Age</div>
                  <div>{d.age || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-soft text-xs uppercase tracking-wide">Gender</div>
                  <div>{d.gender || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-soft text-xs uppercase tracking-wide">Avg / patient</div>
                  <div>~{d.avg_minutes_per_patient} min</div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-slate-soft text-xs uppercase tracking-wide">Availability Today</div>
                  <div className={`font-semibold ${d.schedule?.is_available ? 'text-signal' : 'text-danger'}`}>
                    {d.schedule?.is_available ? 'Available' : 'Not Available'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-soft text-xs uppercase tracking-wide">Room</div>
                  <div className="font-semibold text-ink">
                    {d.schedule?.is_available ? (d.schedule.room_number || 'Not assigned') : '—'}
                  </div>
                </div>
              </div>
              {d.schedule?.delay_minutes > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-800">
                  Doctor is late by {d.schedule.delay_minutes} Minutes
                </div>
              )}
              <div>
                <div>
                  <div className="text-slate-soft text-xs uppercase tracking-wide">Timeslots</div>
                  <div className="flex flex-wrap gap-1">
                    {d.schedule?.is_available && d.schedule.timeslots.length > 0
                      ? d.schedule.timeslots.map(ts => <span key={ts} className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">{ts}</span>)
                      : <span className="text-xs text-slate-400">—</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn-sm bg-white text-ink border border-slate-200 hover:bg-slate-50" onClick={() => goToQueue(d.id)}>
                Open Queue
              </button>
              <button type="button" className="btn-sm bg-white text-ink border border-slate-200 hover:bg-slate-50" onClick={() => openDoctorModal(d)}>
                Edit
              </button>
              <button type="button" className="btn-sm bg-white text-clinical border border-clinical hover:bg-clinical/10" onClick={() => setScheduleDoctor(d)}>
                Manage Schedule
              </button>
              <button type="button" className="btn-sm bg-white text-ink border border-slate-200 hover:bg-slate-50" onClick={() => setPasswordChangeDoctor(d)}>
                Change Password
              </button>
            </div>
          </div>
        ))}
        {!filteredDoctors.length && <div className="card p-8 text-center text-slate-soft col-span-full">{searchQuery ? 'No doctors match your search.' : 'No doctors added yet.'}</div>}
      </div>

      {scheduleDoctor && (
        <ScheduleModal doctor={scheduleDoctor} onClose={() => setScheduleDoctor(null)} onSave={load} />
      )}

      {bulkScheduleOpen && (
        <BulkScheduleModal doctors={doctors} onClose={() => setBulkScheduleOpen(false)} onSave={load} />
      )}

      {passwordChangeDoctor && (
        <ChangePasswordModal doctor={passwordChangeDoctor} onClose={() => setPasswordChangeDoctor(null)} onSave={load} />
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditingDoctor(null); setForm(EMPTY_FORM); setError(''); }} title={editingDoctor ? 'Edit Doctor' : 'Add Doctor'}>
        <form onSubmit={submit} className="space-y-4">
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
          <div>
            <label className="label">Speciality / Specialist</label>
            <input className="input" value={form.speciality} onChange={set('speciality')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact Number</label>
              <input className="input" value={form.contact_number} onChange={set('contact_number')} />
            </div>
            <div>
              <label className="label">Avg. Minutes / Patient</label>
              <input type="number" min="5" className="input" value={form.avg_minutes_per_patient} onChange={set('avg_minutes_per_patient')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Age</label>
              <input type="text" className="input" value={form.age} onChange={set('age')} placeholder="e.g. 32" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={set('gender')}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">District</label>
              <select className="input" value={form.district} onChange={set('district')}>
                <option value="">Select district</option>
                {(LOCATIONS[form.state] || []).map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">State</label>
              <select className="input" value={form.state} onChange={set('state')}>
                <option value="">Select state</option>
                {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pincode</label>
              <input type="text" className="input" value={form.pincode} onChange={set('pincode')} maxLength={6} placeholder="6 digits" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Experience</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" className="input" value={form.experience_years} onChange={set('experience_years')} placeholder="Years" />
                <span className="text-slate-soft">years</span>
              </div>
            </div>
            
          </div>
           <div>
            <div>
              <label className="label">Degree/Certifications</label>
              <div className="space-y-2">
                {form.certifications.map((cert, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      className="input flex-1"
                      value={cert}
                      onChange={(e) => setForm((f) => {
                        const certifications = [...f.certifications];
                        certifications[idx] = e.target.value;
                        return { ...f, certifications };
                      })}
                      placeholder={`Certification ${idx + 1}`}
                    />
                    <button
                      type="button"
                      className="btn-sm bg-white text-danger border border-danger hover:bg-danger/10"
                      onClick={() => setForm((f) => {
                        const certifications = f.certifications.filter((_, index) => index !== idx);
                        return { ...f, certifications: certifications.length ? certifications : [''] };
                      })}
                    >
                      -
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-sm bg-white text-clinical border border-clinical hover:bg-clinical/10"
                  onClick={() => setForm((f) => ({ ...f, certifications: [...f.certifications, ''] }))}
                >
                  + Add degree/certification
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Login Email</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={set('password')}
                placeholder={editingDoctor ? 'Leave blank to keep current password' : ''}
                {...(!editingDoctor ? { required: true } : {})}
              />
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full">{editingDoctor ? 'Save Changes' : 'Add Doctor'}</button>
        </form>
      </Modal>
    </Layout>
  );
}
