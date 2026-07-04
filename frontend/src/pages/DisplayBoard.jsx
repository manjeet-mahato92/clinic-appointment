import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import TokenFlap from '../components/TokenFlap.jsx';

export default function DisplayBoard() {
  const { doctorId } = useParams();
  const [data, setData] = useState(null);
  const [clock, setClock] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => api.get(`/display/queue/${doctorId}`).then((r) => setData(r.data)).catch(() => {});
    load();
    const poll = setInterval(load, 5000);
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [doctorId]);

  if (!data) return <div className="min-h-screen bg-slate-50" />;

  const { hospital, doctor, banner, current, next, upcoming } = data;
  const displayBanner = hospital.banner_url ? { media_type: 'image', media_url: hospital.banner_url, title: hospital.hospital_name } : banner;

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className="border-b border-white/10 px-8 py-5 text-white"
        style={{ backgroundColor: hospital.header_color || '#0f172a' }}
      >
        <div className="flex gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-col items-center gap-4">
            <div className="rounded-2xl mb-2 overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center">
              {hospital.logo_url ? <img src={hospital.logo_url} alt="Logo" className="h-full w-full object-cover" /> : <span className="text-white/70">LOGO</span>}
            </div>
            
            <div> 
             
            </div>
          </div>
           <div className="bg-white/15 inline-flex rounded-full px-4 py-2 text-4xl font-semibold text-white">
             Welcome to {hospital.hospital_name}               
            </div>
          <div className="text-right">
            <div className="bg-white/15 inline-flex rounded-full px-4 py-2 text-4xl font-semibold text-white">
              {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}
            </div>
            
            <div className="text-white/75 text-2xl mt-2">
              {clock.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      <main className="px-8 py-6">
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="grid gap-5">
             <div className="text-black/75 text-2xl font-bold">{doctor.doctor_name} · {doctor.speciality} · {hospital.timing}</div>
            <div className="card p-6 bg-blue-800 text-white">
              <div className="text-lg text-white p-2 font-bold uppercase tracking-wide text-white mb-3">Current Appointment</div>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <TokenFlap value={current?.token_number} />
                <div>
                  <div className="text-6xl font-semibold text-white">{current?.patient_name || 'Waiting…'}</div>
                   
                </div>
              </div>
            </div>

            <div className="card p-6 bg-orange-400 text-black">
              <div className="text-lg text-black p-2 font-bold u mb-3">Next Appointment</div>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <TokenFlap value={next?.token_number} />
                <div>
                  <div className="text-6xl font-semibold text-black">{next?.patient_name || '—'}</div>
                   
                </div>
              </div>
            </div>

            <div className="card bg-white h-64 overflow-hidden p-0">
              {displayBanner ? (
                displayBanner.media_type === 'video' ? (
                  <video src={displayBanner.media_url} className="h-full w-full rounded-2xl object-cover" autoPlay muted loop />
                ) : (
                  <img src={displayBanner.media_url} alt={displayBanner.title} className="h-full w-full rounded-2xl object-cover" />
                )
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl bg-slate-100 text-slate-500 text-sm">Banner / Video Ad</div>
              )}
            </div>
          </div>

          <section className="card p-6 bg-white">
            <div className="text-xs uppercase tracking-wide text-slate-soft mb-4">Upcoming Appointments</div>
            <ul className="space-y-3">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="font-mono font-semibold text-ink number-circle">{a.token_number}</span>
                  <span className="truncate text-ink text-2xl font-bold">{a.patient_name}</span>
                </li>
              ))}
              {!upcoming.length && <li className="text-slate-500 text-sm text-center py-10">No more tokens waiting.</li>}
            </ul>
          </section>
        </div>
        <div className="text-xl font-semibold text-grey mt-4">{hospital.hospital_name}</div>

        <button onClick={() => navigate('/display/select-doctor')} className="mt-8 text-slate-soft text-sm underline">
          ← Switch doctor
        </button>
      </main>
    </div>
  );
}
