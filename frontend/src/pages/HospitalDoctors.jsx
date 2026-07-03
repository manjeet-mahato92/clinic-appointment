import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { hospitalNav } from '../navConfigs.js';
import api from '../api/client.js';
import { STATES, LOCATIONS } from '../utils/locations.js';

const EMPTY_FORM = {
  doctor_name: '', speciality: '', contact_number: '', email: '', password: '', avg_minutes_per_patient: 15,
  age: '', gender: '', district: '', state: '', pincode: '',
  experience_years: '', certifications: [''],
};

export default function HospitalDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const load = () => api.get('/hospital/doctors').then((r) => setDoctors(r.data.map((doctor) => ({
    ...doctor,
    certifications: parseCertifications(doctor.certifications),
  }))));
  useEffect(() => { load(); }, []);

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
        doctor_name: doctor.doctor_name || '',
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
      if (editingDoctor) {
        await api.patch(`/hospital/doctors/${editingDoctor}`, payload);
      } else {
        await api.post('/hospital/doctors', payload);
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
    await api.delete(`/hospital/doctors/${id}`);
    load();
  };

  const goToQueue = (id) => navigate(`/hospital/doctor/${id}/queue`);

  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Doctors</h1>
          <p className="text-slate-soft">Manage doctors, edit their details, and quickly open their queue.</p>
        </div>
        <button className="btn-primary" onClick={() => openDoctorModal(null)}>+ Add Doctor</button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {doctors.map((d) => (
          <div key={d.id} className="card border border-slate-200 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => openDoctorModal(d)}
                  className="text-xl font-semibold text-ink hover:text-clinical text-left w-full"
                >
                  {d.doctor_name}
                </button>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-soft">
                  <span>{d.speciality || 'General clinic'}</span>
                  {d.status && (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {d.status}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => remove(d.id)}
                className="btn-sm bg-white text-danger border border-danger hover:bg-danger/10"
              >
                Delete
              </button>
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
              
               
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn-sm bg-white text-ink border border-slate-200 hover:bg-slate-50" onClick={() => goToQueue(d.id)}>
                Open Queue
              </button>
              <button type="button" className="btn-sm bg-white text-clinical border border-clinical hover:bg-clinical/10" onClick={() => openDoctorModal(d)}>
                Edit
              </button>
            </div>
          </div>
        ))}
        {!doctors.length && <div className="card p-8 text-center text-slate-soft">No doctors added yet.</div>}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditingDoctor(null); setForm(EMPTY_FORM); setError(''); }} title={editingDoctor ? 'Edit Doctor' : 'Add Doctor'}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Doctor Name</label>
            <input className="input" value={form.doctor_name} onChange={set('doctor_name')} required />
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
