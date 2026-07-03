import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { hospitalNav } from '../navConfigs.js';
import api from '../api/client.js';

const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Gujarat', 'Haryana',
  'Karnataka', 'Kerala', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const DISTRICTS = [
  'Adilabad', 'Agra', 'Ahmednagar', 'Ahmedabad', 'Aizawl', 'Alappuzha', 'Aligarh', 'Alirajpur',
  'Almora', 'Alwar', 'Amaravati', 'Amethi', 'Amnour', 'Amravati', 'Amreli', 'Amritsar', 'Anand',
  'Anantapur', 'Anantnag', 'Angul', 'Araria', 'Arwal', 'Ashok Nagar', 'Auraiya', 'Aurangabad',
  'Azamgarh', 'Badgam', 'Bagalkot', 'Baghpat', 'Bahraich', 'Baksa', 'Balaghat',
  'Balangir', 'Balasore', 'Ballia', 'Baloda Bazar', 'Balrampur', 'Banaskantha', 'Banda',
  'Bandipora', 'Bangalore Rural', 'Bangalore Urban', 'Bankura', 'Banswara', 'Barabanki',
  'Baramulla', 'Baran', 'Bareilly', 'Barmer', 'Barnala', 'Barpeta',
  'Bastar', 'Basti', 'Bathinda', 'Beed', 'Begusarai', 'Belagavi', 'Bellary',
  'Betul', 'Bhadohi', 'Bhadradri Kothagudem', 'Bhagalpur', 'Bhandara', 'Bharatpur',
  'Bharuch', 'Bhavnagar', 'Bhilai', 'Bhilwara', 'Bhojpur', 'Bidar', 'Bijnor', 'Bikaner',
  'Birbhum', 'Bishnupur', 'Bokaro', 'Bulandshahr', 'Buxar', 'Chamarajanagar',
  'Chamba', 'Chamoli', 'Champawat', 'Chandauli', 'Chandel', 'Chandigarh', 'Chandrapur',
  'Changlang', 'Chatra', 'Chennai', 'Chhatarpur', 'Chhindwara', 'Chikkaballapur',
  'Chikkamagaluru', 'Chirang', 'Chitradurga', 'Chitrakoot', 'Chittoor', 'Churu',
  'Coimbatore', 'Cooch Behar', 'Cuddalore', 'Cuttack', 'Dadra and Nagar Haveli',
  'Daman', 'Dantewada', 'Darbhanga', 'Darjeeling', 'Darrang', 'Datia', 'Dehradun',
  'Deoghar', 'Dewas', 'Dhubri', 'Dhule', 'Dibang Valley', 'Dibrugarh', 'Dindigul',
  'Dindori', 'Dimapur', 'Diu', 'Doda', 'East Champaran', 'East Delhi', 'East Godavari',
  'East Khasi Hills', 'East Siang', 'East Sikkim', 'East Singhbhum', 'Erode',
  'Faridabad', 'Faridkot', 'Farrukhabad', 'Fatehgarh Sahib', 'Fatehpur', 'Fazilka',
  'Firozabad', 'Gadag', 'Ganderbal', 'Ganjam', 'Gaya', 'Giridih', 'Godda', 'Golaghat',
  'Gonda', 'Gorakhpur', 'Gulbarga', 'Gumla', 'Gurdaspur', 'Gurgaon', 'Gwalior',
  'Hajipur', 'Hamirpur', 'Harda', 'Hassan', 'Hathras', 'Haveri', 'Hazaribagh', 'Hingoli',
  'Hooghly', 'Hoshangabad', 'Hoshiarpur', 'Howrah', 'Hyderabad', 'Idukki',
  'Imphal East', 'Imphal West', 'Indore', 'Jabalpur', 'Jagatsinghpur', 'Jaipur',
  'Jalandhar', 'Jalgaon', 'Jalna', 'Jamtara', 'Janjgir-Champa', 'Jashpur', 'Jaunpur',
  'Jehanabad', 'Jhabua', 'Jharsuguda', 'Jhansi', 'Jhunjhunu', 'Jind', 'Jodhpur',
  'Jorhat', 'Junagadh', 'Kadapa', 'Kaimur', 'Kanchipuram', 'Kandhamal', 'Kangra',
  'Kanyakumari', 'Kapurthala', 'Karaikal', 'Kargil', 'Karimganj', 'Karimnagar',
  'Karnal', 'Karur', 'Kasaragod', 'Kathua', 'Katihar', 'Katni', 'Kendrapara',
  'Kendujhar', 'Khagaria', 'Khammam', 'Khandwa', 'Khargone', 'Kheda', 'Kinnaur',
  'Koderma', 'Kohima', 'Kolasib', 'Kolhapur', 'Kolkata', 'Kollam', 'Koppal',
  'Kosi', 'Kota', 'Kothagudem', 'Kozhikode', 'Krishna', 'Kulgam', 'Kupwara',
  'Kurnool', 'Kurukshetra', 'Kushinagar', 'Lahaul and Spiti', 'Lakhimpur',
  'Lakhimpur Kheri', 'Lalitpur', 'Landour', 'Latehar', 'Latur', 'Leh', 'Lohardaga',
  'Lonavala', 'Ludhiana', 'Madhepura', 'Madurai', 'Maharajganj', 'Mahasamund',
  'Mahbubnagar', 'Mahe', 'Mainpuri', 'Malappuram', 'Mandi', 'Mangaluru', 'Mansa',
  'Mathura', 'Mayiladuthurai', 'Medak', 'Meerut', 'Mehsana', 'Mirzapur', 'Moga',
  'Moradabad', 'Morbi', 'Mormugao', 'Morigaon', 'Muzaffarpur', 'Mumbai', 'Munger',
  'Murshidabad', 'Muzaffarnagar', 'Mysore', 'Nabarangpur', 'Nadia', 'Nagaon',
  'Nagapattinam', 'Nagaur', 'Nalgonda', 'Nainital', 'Nanded', 'Nandurbar',
  'Narsinghpur', 'Narayanpet', 'Narnaul', 'Nashik', 'Navsari', 'Nawada', 'Neemuch',
  'Nellore', 'Nizamabad', 'North Goa', 'North Sikkim', 'Nuapada', 'Ongole',
  'Palakkad', 'Pali', 'Palwal', 'Panaji', 'Panchkula', 'Panipat', 'Parbhani',
  'Patan', 'Pathankot', 'Pathanamthitta', 'Patiala', 'Patna', 'Pauri Garhwal',
  'Pilibhit', 'Pondicherry', 'Pratapgarh', 'Prayagraj', 'Pudukkottai', 'Pulwama',
  'Pune', 'Purba Bardhaman', 'Puri', 'Purulia', 'Raebareli', 'Raichur', 'Raigarh',
  'Raigad', 'Rajkot', 'Rajnandgaon', 'Ramanagara', 'Ramanathapuram', 'Ramban',
  'Rampur', 'Ranchi', 'Ratia', 'Ratlam', 'Rayagada', 'Reasi', 'Rewa', 'Rohtak',
  'Rohtas', 'Rudraprayag', 'Sagar', 'Saharanpur', 'Saharsa', 'Sahibganj', 'Sikar',
  'Siliguri', 'Simdega', 'Sindhudurg', 'Singrauli', 'Sitamarhi', 'Sitapur',
  'Sivaganga', 'Siwan', 'Solan', 'Solapur', 'Sonipat', 'Sonitpur', 'Sri Ganganagar',
  'Srinagar', 'Sultanpur', 'Sundergarh', 'Supaul', 'Surat', 'Surendranagar', 'Tawang',
  'Tehri Garhwal', 'Thane', 'Thanjavur', 'Theni', 'Thiruvallur', 'Thiruvananthapuram',
  'Thrissur', 'Tikamgarh', 'Tinsukia', 'Tirap', 'Tiruchirappalli', 'Tirunelveli',
  'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Tuticorin', 'Udaipur',
  'Udalguri', 'Udham Singh Nagar', 'Udupi', 'Ujjain', 'Ukhrul', 'Una', 'Unnao',
  'Upper Siang', 'Uttar Dinajpur', 'Uttarkashi', 'Vadodara', 'Vaishali', 'Valsad',
  'Varanasi', 'Vellore', 'Vidisha', 'Viluppuram', 'Virudhunagar', 'Visakhapatnam',
  'Vizianagaram', 'Wayanad', 'West Champaran', 'West Delhi', 'West Godavari',
  'West Kameng', 'West Khasi Hills', 'West Siang', 'West Singhbhum', 'West Sikkim',
  'Yadgir', 'Yamuna Nagar', 'Yanam', 'Yavatmal', 'Yercaud', 'Zunheboto',
];

const EMPTY_FORM = {
  patient_name: '', contact_number: '', email: '', address: '', whatsapp_available: false,
  adhar_card: '', age: '', gender: '', district: '', state: '', pincode: '',
};

export default function HospitalPatients() {
  const [patients, setPatients] = useState([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAppointments, setHistoryAppointments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const navigate = useNavigate();

  const load = () => api.get('/hospital/patients', { params: q ? { q } : {} }).then((r) => setPatients(r.data));
  useEffect(() => { load(); }, [q]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'whatsapp_available' ? e.target.checked : e.target.value }));

  const openPatientModal = (patient) => {
    if (patient) {
      setEditingPatient(patient.id);
      setForm({
        patient_name: patient.patient_name,
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
      if (editingPatient) {
        await api.patch(`/hospital/patients/${editingPatient}`, form);
      } else {
        await api.post('/hospital/patients', form);
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
    await api.delete(`/hospital/patients/${id}`);
    load();
  };

  const whatsappLink = (phone, name) =>
    `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi ${name}, this is regarding your clinic appointment.`)}`;

  const totalPatients = patients.length;
  const whatsappCount = patients.filter((patient) => patient.whatsapp_available).length;

  return (
    <Layout title="Hospital / Clinic" navItems={hospitalNav}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
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

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <input className="input max-w-lg flex-1" placeholder="Search by name, phone, district…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary" onClick={() => setQ('')}>Clear</button>
          <button className="btn-primary" onClick={() => openPatientModal(null)}>New Patient</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper text-slate-soft text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Patient</th>
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
                    <div className="font-semibold text-ink">{p.patient_name}</div>
                    <div className="text-xs text-slate-soft">{p.contact_number || 'No contact'}</div>
                  </td>
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
                          const res = await api.get('/hospital/appointments', { params: { patient_id: p.id } });
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
                  <td colSpan={5} className="text-center py-10 text-slate-soft">No patients found.</td>
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
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Patient Name</label>
              <input className="input" value={form.patient_name} onChange={set('patient_name')} required />
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
              <label className="label">District</label>
              <select className="input" value={form.district} onChange={set('district')}>
                <option value="">Select district</option>
                {DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
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
