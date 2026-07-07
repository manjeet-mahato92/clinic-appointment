import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { hospitalNav, superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { STATES, LOCATIONS } from '../utils/locations.js';

const EMPTY_FORM = {
  first_name: '', last_name: '', contact_number: '', email: '', address: '', whatsapp_available: false,
  adhar_card: '', age: '', gender: '', district: '', state: '', pincode: '',
};

export default function HospitalPatients() {
  const [patients, setPatients] = useState([]);
  const [filters, setFilters] = useState({ state: '', district: '', gender: '', sortBy: '' });
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAppointments, setHistoryAppointments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { user } = useAuth();
  const { hospitalId } = useParams();
  const navigate = useNavigate();

  const load = () => {
    const params = { q, ...filters };
    const url = user.role === 'super_admin'
      ? `/super-admin/hospitals/${hospitalId}/patients`
      : '/hospital/patients';
    api.get(url, { params }).then((r) => setPatients(r.data));
  };
  useEffect(() => { load(); }, [q, filters, user.role, hospitalId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'whatsapp_available' ? e.target.checked : e.target.value }));
  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, ...(k === 'state' && { district: '' }) }));


  const openPatientModal = (patient) => {
    if (patient) {
      setEditingPatient(patient.id);
      setForm({
        first_name: patient.first_name,
        last_name: patient.last_name,
        contact_number: patient.contact_number,
        email: patient.email || '',
        address: patient.address || '',
        whatsapp_available: patient.whatsapp_available === 1,
        adhar_card: patient.adhar_card || '',
        age: patient.age || '',
        gender: patient.gender || '',
        district: patient.district || '',
        state: patient.state || '',
        pincode: patient.pincode || '',
      });
      setOpen(true);
      return;
    }
    setEditingPatient(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = user.role === 'super_admin' ? `/super-admin/hospitals/${hospitalId}/patients` : '/hospital/patients';
      if (editingPatient) {
        await api.patch(`${url}/${editingPatient}`, form);
      } else {
        await api.post(url, form);
      }
      setOpen(false);
      setEditingPatient(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save patient');
    }
  };

  const remove = async (id) => {
    if (!confirm('Remove this patient?')) return;
    const url = user.role === 'super_admin' ? `/super-admin/hospitals/${hospitalId}/patients/${id}` : `/hospital/patients/${id}`;
    await api.delete(url);
    load();
  };

  const whatsappLink = (phone, name) =>
    `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi ${name}, this is regarding your clinic appointment.`)}`;

  const totalPatients = patients.length;
  const whatsappCount = patients.filter((patient) => patient.whatsapp_available).length;

  const navItems = user.role === 'super_admin' ? superAdminNav : hospitalNav;
  const layoutTitle = user.role === 'super_admin' ? 'Super Admin' : 'Hospital / Clinic';

  return (
    <Layout title={layoutTitle} navItems={navItems}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
        {user.role === 'super_admin' && (
          <Link to={`/super-admin/hospitals/${hospitalId}/edit`} className="text-sm text-slate-soft hover:underline absolute top-6">← Back to Hospital</Link>
        )}
        <div>
          <h1 className="text-2xl font-semibold">Patients</h1>
          <p className="text-slate-soft">Manage patient records, appointments, and contact preferences in one place.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" onClick={() => openPatientModal(null)}>+ Add Patient</button>
          <button className="btn-secondary" onClick={() => navigate('/hospital')}>+ Add Appointment</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-5">
        <div className="card p-4">
          <div className="text-sm text-slate-soft">Total patients</div>
          <div className="mt-3 text-3xl font-semibold text-ink">{totalPatients}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-soft">WhatsApp available</div>
          <div className="mt-3 text-3xl font-semibold text-ink">{whatsappCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-soft">Current filter</div>
          <div className="mt-3 text-sm font-semibold text-ink">{q ? <span className="rounded-full bg-slate-100 px-3 py-1">{q}</span> : 'All patients'}</div>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <input className="input lg:col-span-2" placeholder="Search by name, phone, district…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={filters.state} onChange={setFilter('state')}>
            <option value="">All States</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={filters.district} onChange={setFilter('district')} disabled={!filters.state}>
            <option value="">All Districts</option>
            {(LOCATIONS[filters.state] || []).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input" value={filters.gender} onChange={setFilter('gender')}>
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Others">Others</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <div className="flex-1">
            <label className="label text-xs">Sort By</label>
            <select className="input max-w-xs" value={filters.sortBy} onChange={setFilter('sortBy')}>
              <option value="">Most Recent</option>
              <option value="most_visited">Most Visited</option>
            </select>
          </div>
          <button className="btn-secondary" onClick={() => { setQ(''); setFilters({ state: '', district: '', gender: '', sortBy: '' }); }}>Clear Filters</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper text-slate-soft text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Visits</th>
                <th className="text-left px-5 py-3">Age</th>
                <th className="text-left px-5 py-3">Location</th>
                <th className="text-left px-5 py-3">WhatsApp</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-ink">{p.first_name} {p.last_name}</div>
                    <div className="text-xs text-slate-soft">{p.contact_number || 'No contact'}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-soft font-semibold">{p.appointment_count}</td>
                  <td className="px-5 py-4 text-slate-soft">{p.age || '—'}</td>
                  <td className="px-5 py-4 text-slate-soft">{[p.district, p.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      className="btn-sm bg-white text-ink border border-slate-200 hover:bg-slate-50"
                      onClick={async () => {
                        setHistoryLoading(true);
                        setHistoryOpen(true);
                        try {
                          const url = user.role === 'super_admin' ? `/super-admin/hospitals/${hospitalId}/appointments` : '/hospital/appointments';
                          const res = await api.get(url, { params: { patient_id: p.id } });
                          setHistoryAppointments(res.data);
                        } catch (err) {
                          setHistoryAppointments([]);
                        } finally {
                          setHistoryLoading(false);
                        }
                      }}
                    >
                      Appointment History
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                    {p.whatsapp_available && (
                      <a
                        href={whatsappLink(p.contact_number, p.patient_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-sm bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      >
                        WhatsApp
                      </a>
                    )}
                    <button onClick={() => openPatientModal(p)} className="btn-sm bg-white text-ink border border-slate-200 hover:bg-slate-50">Edit</button>
                    <button onClick={() => navigate(`/hospital?patient_id=${p.id}`)} className="btn-sm bg-white text-clinical border border-clinical hover:bg-clinical/10">Appointment</button>
                    <button onClick={() => remove(p.id)} className="btn-sm bg-danger/10 text-danger border border-danger hover:bg-danger/20">Delete</button>
                  </td>
                </tr>
              ))}
              {!patients.length && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-soft">No patients found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={historyOpen} onClose={() => { setHistoryOpen(false); setHistoryAppointments([]); }} title="Appointment History">
        <div className="space-y-3">
          {historyLoading && <div className="text-sm text-slate-soft">Loading…</div>}
          {!historyLoading && !historyAppointments.length && (
            <div className="text-sm text-slate-soft">No appointments found for this patient.</div>
          )}
          {!historyLoading && historyAppointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 p-3 border rounded">
              <div>
                <div className="font-medium">#{a.token_number} — {a.appointment_date}</div>
                <div className="text-sm text-slate-soft">{a.doctor_name} — {a.speciality || 'General'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-soft">{a.status}</div>
                {a.whatsapp_available === 1 && (
                  <a href={whatsappLink(a.patient_contact, a.patient_name)} target="_blank" rel="noreferrer" className="btn-sm mt-2 bg-white text-clinical border border-clinical hover:bg-clinical/10">WhatsApp</a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={open} onClose={() => { setOpen(false); setEditingPatient(null); setForm(EMPTY_FORM); }} title={editingPatient ? 'Edit Patient' : 'Add Patient'}>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.first_name} onChange={set('first_name')} required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name} onChange={set('last_name')} required />
            </div>
            <div>
              <label className="label">Contact Number</label>
              <input className="input" value={form.contact_number} onChange={set('contact_number')} required />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="label">Aadhaar Card</label>
              <input className="input" value={form.adhar_card} onChange={set('adhar_card')} maxLength={12} placeholder="12 digits" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="label">Age</label>
              <input type="number" min="0" max="120" className="input" value={form.age} onChange={set('age')} />
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
            <div className="flex flex-col justify-end">
              <label className="label">WhatsApp available</label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.whatsapp_available} onChange={set('whatsapp_available')} />
                Yes
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            
            <div>
              <label className="label">State</label>
              <select className="input" value={form.state} onChange={set('state')}>
                <option value="">Select state</option>
                {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
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
              <label className="label">Pincode</label>
              <input className="input" value={form.pincode} onChange={set('pincode')} maxLength={6} placeholder="6 digits" />
            </div>
          </div>

          <div>
            <label className="label">Address</label>
            <textarea rows={3} className="input resize-none" value={form.address} onChange={set('address')} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full">{editingPatient ? 'Save Changes' : 'Add Patient'}</button>
        </form>
      </Modal>
    </Layout>
  );
}
