import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';

const formatDoctorName = (queue) => {
  const name = queue.doctor_name || [queue.first_name, queue.last_name].filter(Boolean).join(' ');
  if (!name) return 'Doctor';
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
};

export default function DisplayBoardAll() {
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
        if (active) {
          setError(err.response?.data?.error || 'Could not load the all-doctors display.');
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
  }, [reloadKey]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#eff9eb] flex items-center justify-center text-slate-600">
        Loading all-doctors display…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#eff9eb] flex items-center justify-center px-4">
        <div className="card max-w-md text-center" role="alert">
          <h1 className="text-xl font-semibold text-ink">Display unavailable</h1>
          <p className="text-danger text-sm mt-2">{error}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setLoading(true);
                setReloadKey((key) => key + 1);
              }}
            >
              Try again
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/display/select-doctor')}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { hospital, queues } = data;

  return (
    <div className="min-h-screen bg-[#eff9eb]">
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
              <p className="text-sm text-white/75">Live doctor queue and room information</p>
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

      <main className="mx-auto max-w-[1800px] p-3 md:p-6">
        <section className="min-h-[68vh] overflow-hidden border-2 border-[#188612] bg-[#e8ffe4] shadow-xl">
          <div className="overflow-x-auto">
            <div className="min-w-[1050px]">
              <div className="grid grid-cols-[1.35fr_0.95fr_1.65fr_0.55fr] bg-[#138300] text-white">
                {['Doctor', 'Current', 'Next', 'Room'].map((heading) => (
                  <div key={heading} className="px-6 py-4 text-2xl font-black uppercase tracking-wide lg:text-4xl">
                    {heading}
                  </div>
                ))}
              </div>

              {queues.map((queue, index) => (
                <div
                  key={queue.id}
                  className={`grid min-h-28 grid-cols-[1.35fr_0.95fr_1.65fr_0.55fr] items-center ${
                    queue.delay_minutes > 0
                      ? 'bg-gray-300'
                      : index % 2 === 0
                        ? 'bg-[#c9efba]'
                        : 'bg-[#f3edb4]'
                  }`}
                >
                  <div className="px-6 py-5">
                    <div className="text-2xl font-black uppercase leading-tight text-slate-950 lg:text-4xl">
                      {formatDoctorName(queue)}
                    </div>
                    {queue.speciality && (
                      <div className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-700 lg:text-base">
                        {queue.speciality}
                      </div>
                    )}
                    {queue.delay_minutes > 0 && (
                      <div
                        className="mt-2 inline-flex rounded-lg border border-red-700 bg-red-600 px-3 py-1 text-sm font-black text-white lg:text-base"
                        role="status"
                      >
                        Doctor is late by {queue.delay_minutes} Minutes
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-5">
                    <div className="flex min-h-16 items-center gap-3 bg-[#ffc514] px-4 py-2 text-slate-950">
                      {queue.current ? (
                        <>
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-2xl font-black text-white">
                            {queue.current.token_number}
                          </span>
                          <span className="truncate text-2xl font-black lg:text-3xl">
                            {queue.current.patient_name}
                          </span>
                        </>
                      ) : (
                        <span className="text-xl font-bold">Waiting…</span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-5">
                    <div className="flex min-h-16 items-center gap-3 overflow-hidden bg-[#086783] px-4 py-2">
                      {queue.next.length ? queue.next.map((appointment) => (
                        <span
                          key={appointment.id}
                          className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full bg-white px-2 text-xl font-black text-[#086783] lg:text-2xl"
                          title={appointment.patient_name}
                        >
                          {appointment.token_number}
                        </span>
                      )) : (
                        <span className="text-xl font-bold text-white/80">No waiting tokens</span>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-5 text-center">
                    <div className="inline-flex min-h-16 min-w-28 items-center justify-center rounded-2xl bg-[#ff7900] px-4 text-4xl font-black text-white shadow-sm lg:text-5xl">
                      {queue.room_number || '—'}
                    </div>
                  </div>
                </div>
              ))}

              {!queues.length && (
                <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-xl font-semibold text-slate-600">
                  No doctors are marked available for today.
                </div>
              )}
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate('/display/select-doctor')}
          className="mt-5 text-sm font-semibold text-slate-600 underline"
        >
          ← Switch display view
        </button>
      </main>
    </div>
  );
}
