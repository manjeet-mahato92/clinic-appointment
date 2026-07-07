import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import TokenFlap from '../components/TokenFlap.jsx';

export default function DisplayBoard() {
  const { doctorId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [clock, setClock] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await api.get(`/display/queue/${doctorId}`);
        if (active) {
          setData(response.data);
          setError('');
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || 'Could not load the display board.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const poll = setInterval(load, 5000);
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => {
      active = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [doctorId, reloadKey]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-soft">
        Loading display board…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="card max-w-md text-center" role="alert">
          <h1 className="text-xl font-semibold text-ink">Display unavailable</h1>
          <p className="text-danger text-sm mt-2">{error}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <button type="button" className="btn-primary" onClick={() => {
              setLoading(true);
              setReloadKey((key) => key + 1);
            }}>
              Try again
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/display/select-doctor')}>
              Select another doctor
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { hospital, doctor, banner, current, next, upcoming } = data;
  const displayBanner = hospital.banner_url ? { media_type: 'image', media_url: hospital.banner_url, title: hospital.hospital_name } : banner;

  return (
    <div className="min-h-screen bg-slate-50">
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-center text-danger text-sm" role="status">
          Connection interrupted. Showing the latest queue data while retrying…
        </div>
      )}
       <header
        className="px-5 py-4 text-white shadow-md"
        style={{ backgroundColor: hospital.header_color || '#0f172a' }}
      >
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/10 flex items-center justify-center">
              {hospital.logo_url
                ? <img src={hospital.logo_url} alt="" className="h-full w-full object-cover" />
                : <span className="text-xs text-white/70">LOGO</span>}
            </div>
            <div>
              <h1 className="text-xl font-bold md:text-2xl">{hospital.hospital_name}</h1>
              <p className="text-sm text-white/75">Live patient queue</p>
            </div>
          </div>
          <div className="md:text-right">
            <div className="text-4xl font-bold">
              {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}
            </div>
            <div className="text-sm text-white/75">
              {clock.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      <main className="px-8 py-6">
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="grid gap-5 content-start">
            <div className="text-black/75 text-xl font-bold">{doctor.doctor_name} · {doctor.speciality} · {hospital.timing}</div>
            {doctor.delay_minutes > 0 && (
              <div
                className="rounded-2xl border-2 border-red-700 bg-red-600 px-6 py-4 text-center text-2xl font-black text-white shadow-sm"
                role="status"
              >
                Doctor is late by {doctor.delay_minutes} Minutes
              </div>
            )}
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
                  <span className="font-mono font-semibold text-ink text-xl number-circle">{a.token_number}</span>
                  <span className="truncate text-ink text-2xl font-bold">{a.patient_name}</span>
                </li>
              ))}
              {!upcoming.length && <li className="text-slate-500 text-sm text-center py-10">No more tokens waiting.</li>}
            </ul>
          </section>
        </div>

        <button onClick={() => navigate('/display/select-doctor')} className="mt-8 text-slate-soft text-sm underline">
          ← Switch doctor
        </button>
      </main>
    </div>
  );
}
