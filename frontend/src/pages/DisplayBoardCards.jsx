import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';

const cardAccents = ['#0f4c9a', '#d41468', '#3f8f24', '#e35705', '#0d5cab', '#078b8c', '#d71920', '#55319a', '#087b88', '#b97800'];

const formatToken = (token, fallback = '--') => {
  if (token === null || token === undefined || token === '') return fallback;
  return String(token).padStart(2, '0');
};

const parseTimeslots = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return String(value).split(',').map((slot) => slot.trim()).filter(Boolean);
  }
};

const scheduleLabel = (timeslots) => {
  const slots = parseTimeslots(timeslots);
  if (!slots.length) return 'Time: Not scheduled';

  const firstSlot = String(slots[0]).split(/\s*(?:-|\u2013|\u2014)\s*/).filter(Boolean);
  const lastSlot = String(slots[slots.length - 1]).split(/\s*(?:-|\u2013|\u2014)\s*/).filter(Boolean);
  const start = firstSlot[0] || slots[0];
  const end = lastSlot[lastSlot.length - 1] || slots[slots.length - 1];
  return `Time: ${start} - ${end}`;
};

const formatDoctorName = (queue) => {
  const name = queue.doctor_name || [queue.first_name, queue.last_name].filter(Boolean).join(' ');
  if (!name) return 'Doctor';
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
};

const delayLabel = (minutes) => `Doctor is late by ${minutes} Minutes`;

const getQueueState = (queue) => {
  const next = Array.isArray(queue.next) ? queue.next : [];
  const isAvailable = Number(queue.is_available) === 1;

  if (!isAvailable) {
    return {
      label: 'OPD NOT SCHEDULED',
      token: '--',
      nextTokens: [],
      note: 'No schedule for today',
      muted: true,
    };
  }

  if (queue.current) {
    return {
      label: 'NOW SERVING',
      token: formatToken(queue.current.token_number),
      nextTokens: next.slice(0, 3),
      note: queue.room_number ? `Proceed to Room ${queue.room_number}` : '',
      muted: false,
    };
  }

  if (next.length) {
    return {
      label: 'NEXT TOKEN',
      token: formatToken(next[0].token_number),
      nextTokens: next.slice(1, 4),
      note: queue.room_number ? `Room ${queue.room_number}` : '',
      muted: false,
    };
  }

  return {
    label: 'NO PATIENT IN QUEUE',
    token: '00',
    nextTokens: [],
    note: 'No waiting tokens',
    muted: false,
  };
};

const getCrowdStatus = (queues) => {
  const waiting = queues.reduce((total, queue) => total + (Array.isArray(queue.next) ? queue.next.length : 0), 0);
  if (waiting >= 25) return { label: 'HIGH', tone: '#dc2626', waiting };
  if (waiting >= 8) return { label: 'MODERATE', tone: '#65a30d', waiting };
  return { label: 'LOW', tone: '#16a34a', waiting };
};

export default function DisplayBoardCards() {
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
        const response = await api.get('/display/all-queues');
        if (active) {
          setData(response.data);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Could not load the OPD appointment display.');
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
  }, [reloadKey]);

  const queues = data?.queues || [];
  const crowd = useMemo(() => getCrowdStatus(queues), [queues]);

  if (loading && !data) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading OPD appointment display...</div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-white/10 bg-white p-6 text-center shadow-xl" role="alert">
          <h1 className="text-xl font-semibold text-slate-950">Display unavailable</h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" className="btn-primary" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/display/select-doctor')}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  const { hospital } = data;
  const headerColor = hospital.header_color || '#073b7a';
  const delayedDoctors = queues.filter((queue) => Number(queue.delay_minutes) > 0).length;
  const updatedAt = clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 p-3 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1920px] flex-col overflow-hidden rounded-lg border-4 border-slate-800 bg-slate-100 shadow-2xl">
        <header className="grid gap-px bg-white/15 text-white lg:grid-cols-[1.05fr_2.15fr_1fr]" style={{ backgroundColor: headerColor }}>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/25 bg-white/10">
              {hospital.logo_url ? (
                <img src={hospital.logo_url} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-3xl font-black">+</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-2xl font-black uppercase leading-tight">{hospital.hospital_name}</div>
              <div className="mt-1 text-sm font-semibold uppercase tracking-wide text-white/80">OPD Queue</div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center border-y border-white/15 px-4 py-3 text-center lg:border-x lg:border-y-0">
            <h1 className="text-3xl font-black uppercase tracking-wide md:text-5xl">OPD Appointment Display</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-base font-bold text-white/90 md:text-xl">
              <span>Real-time Queue Status</span>
              <span>{clock.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <span>{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4 lg:justify-center">
            <div>
              <div className="text-sm font-bold text-white/80">Today's OPD</div>
              <div className="text-xl font-black">Crowd Status</div>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-center">
              <div className="text-3xl font-black" style={{ color: crowd.tone }}>{crowd.label}</div>
              <div className="text-xs font-bold text-white/75">{crowd.waiting} waiting</div>
            </div>
          </div>
        </header>

        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700" role="status">
            Connection interrupted. Showing latest queue data while retrying.
          </div>
        )}

        <main className="flex-1 bg-[#edf3fb] p-3 md:p-4">
          <div className="grid h-full auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {queues.map((queue, index) => {
              const accent = cardAccents[index % cardAccents.length];
              const state = getQueueState(queue);
              const nextTokens = state.nextTokens.map((appointment) => formatToken(appointment.token_number)).join(', ');
              const delayMinutes = Number(queue.delay_minutes) || 0;
              const isDelayed = delayMinutes > 0;
              const statusColor = isDelayed ? '#dc2626' : state.muted ? '#64748b' : accent;

              return (
                <article
                  key={queue.id}
                  className={`flex min-h-[248px] flex-col rounded-lg border bg-white shadow-sm ${isDelayed ? 'border-red-300' : state.muted ? 'border-slate-300 opacity-90' : 'border-slate-200'}`}
                >
                  <div className="flex items-start gap-3 px-4 pt-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-3xl font-black text-white" style={{ backgroundColor: state.muted ? '#64748b' : accent }}>
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-black leading-tight" style={{ color: state.muted ? '#475569' : accent }}>
                        {formatDoctorName(queue)}
                      </h2>
                      <p className="truncate text-lg font-semibold text-slate-700">{queue.speciality || 'General clinic'}</p>
                      {isDelayed && (
                        <div className="mt-2 inline-flex max-w-full rounded bg-red-600 px-2 py-1 text-xs font-black uppercase text-white" role="status">
                          {delayLabel(delayMinutes)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pt-4 text-center text-lg font-black text-slate-950">
                    {scheduleLabel(queue.timeslots)}
                  </div>

                  <div className="mx-4 mt-3 overflow-hidden rounded-md border border-slate-200">
                    <div className="px-3 py-1 text-center text-base font-black uppercase text-white md:text-lg" style={{ backgroundColor: statusColor }}>
                      {isDelayed ? delayLabel(delayMinutes) : state.label}
                    </div>
                    <div className="bg-slate-50 px-4 py-3 text-center">
                      <div className="text-7xl font-black leading-none" style={{ color: isDelayed ? '#dc2626' : state.muted ? '#64748b' : accent }}>{state.token}</div>
                      {state.note && <div className="mt-2 text-sm font-black text-slate-700">{state.note}</div>}
                      <div className="mt-3 border-t border-slate-200 pt-2 text-sm font-black uppercase text-slate-700">Next</div>
                      <div className="min-h-8 text-3xl font-black tracking-wide text-slate-950">{nextTokens || '--'}</div>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 px-4 py-3 text-base font-black text-slate-800">
                    <span>Waiting: {Array.isArray(queue.next) ? queue.next.length : 0}</span>
                    <span>Room: {queue.room_number || '--'}</span>
                  </div>
                </article>
              );
            })}

            {!queues.length && (
              <div className="col-span-full flex min-h-[50vh] items-center justify-center rounded-lg border border-slate-200 bg-white text-center text-xl font-semibold text-slate-600">
                No doctors found for today's OPD display.
              </div>
            )}
          </div>
        </main>

        <footer className="bg-[#eef4fb]">
          <div className="grid gap-3 border-t border-slate-300 p-3 lg:grid-cols-[1fr_1.7fr_1.15fr]">
            <section className="flex items-center gap-4 rounded-lg bg-[#073b7a] px-5 py-4 text-white">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-white/10 text-2xl font-black">!</div>
              <div>
                <div className="text-lg font-black uppercase">Announcement</div>
                <div className="mt-1 text-base font-semibold text-white/90">Please keep your token ready and follow room instructions.</div>
              </div>
            </section>

            <section className="flex items-center justify-between gap-5 rounded-lg border border-slate-300 bg-white px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-green-100 text-3xl font-black text-green-700">+</div>
                <div>
                  <div className="inline-flex rounded bg-green-700 px-3 py-1 text-base font-black uppercase text-white">Health Tips</div>
                  <div className="mt-2 text-lg font-black text-slate-950">
                    Drink plenty of water, eat healthy, stay active, and follow your doctor&apos;s advice.
                  </div>
                </div>
              </div>
              <div className="hidden rounded-md bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-700 xl:block">
                Updated<br />{updatedAt}
              </div>
            </section>

            <section className="rounded-lg bg-[#073b7a] px-5 py-4 text-white">
              <div className="text-lg font-black uppercase">General Information</div>
              <div className="mt-2 grid gap-1 text-base font-semibold text-white/90">
                <div>Crowd status: {crowd.label}</div>
                <div>Delayed doctors: {delayedDoctors}</div>
                <div>Consultation time may vary.</div>
              </div>
            </section>
          </div>

          <div className="grid gap-px bg-white/15 text-white md:grid-cols-[1fr_1fr_1fr]" style={{ backgroundColor: headerColor }}>
            <div className="px-5 py-3 text-lg font-bold">Thank you for your patience</div>
            <div className="border-y border-white/15 px-5 py-3 text-center text-lg font-bold md:border-x md:border-y-0">
              Live OPD queue status
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-3 text-lg font-bold md:justify-end">
              <span>Powered by Cliniqo</span>
              <button type="button" onClick={() => navigate('/display/select-doctor')} className="text-sm font-semibold text-white/80 underline">
                Switch view
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
