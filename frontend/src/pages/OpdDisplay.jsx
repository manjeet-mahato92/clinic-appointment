import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge.jsx';
import api from '../api/client.js';

export default function OpdDisplay() {
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
        if (active) setError(err.response?.data?.error || 'Could not load the OPD display.');
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
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-soft">Loading OPD Display…</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="card max-w-md text-center" role="alert">
          <h1 className="text-xl font-semibold text-ink">Display Unavailable</h1>
          <p className="text-danger text-sm mt-2">{error}</p>
          <button type="button" className="btn-primary mt-4" onClick={() => setReloadKey(k => k + 1)}>Try Again</button>
        </div>
      </div>
    );
  }

  const { hospital, queues } = data;

  const getDoctorDisplayStatus = (queue) => {
    if (!queue.is_available) return { text: 'Not Available', color: 'bg-gray-500' };
    if (queue.current) return { text: 'Consulting', color: 'bg-blue-600' };
    if (queue.next.length > 0) return { text: 'Available', color: 'bg-green-600' };
    return { text: 'Wrapping Up', color: 'bg-amber-500' };
  };

  // Simple crowd estimation based on total waiting patients
  const crowdStatus = (() => {
    const totalWaiting = queues.reduce((sum, q) => sum + q.next.length, 0);
    if (totalWaiting > 30) return { text: 'High', color: 'bg-red-500' };
    if (totalWaiting > 10) return { text: 'Moderate', color: 'bg-yellow-500' };
    return { text: 'Low', color: 'bg-green-500' };
  })();

  return (
    <div className="min-h-screen bg-slate-100">
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-center text-danger text-sm" role="status">
          Connection interrupted. Retrying…
        </div>
      )}

      <header className="px-5 py-3 text-white shadow-md" style={{ backgroundColor: '#0F3D91' }}>
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {hospital.logo_url && (
              <div className="shrink-0 h-12 w-12 overflow-hidden rounded-xl border border-white/20 bg-white/10 flex items-center justify-center">
                <img src={hospital.logo_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">{hospital.hospital_name}</h1>
              <p className="text-sm text-white/75">OPD Appointment Display</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs font-bold tracking-wider">CROWD</div>
              <div className={`mt-1 text-lg font-bold px-3 py-0.5 rounded-full text-white ${crowdStatus.color}`}>{crowdStatus.text}</div>
            </div>
            <div className="md:text-right">
              <div className="text-4xl font-bold">
                {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
              <div className="text-sm text-white/75">
                {clock.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] p-3 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {queues.map((queue) => (
            <div key={queue.id} className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col text-slate-800">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-slate-900">Dr. {queue.doctor_name}</div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full text-white ${getDoctorDisplayStatus(queue).color}`}>{getDoctorDisplayStatus(queue).text}</div>
                </div>
                <div className="text-sm text-slate-500">{queue.speciality}</div>
              </div>

              <div className="p-4 text-center bg-blue-50">
                <div className="text-sm font-bold text-blue-800">NOW SERVING</div>
                <div className="text-8xl font-extrabold text-blue-900 my-1">{queue.current?.token_number || '-'}</div>
              </div>

              <div className="p-4 flex-grow">
                <div className="text-center">
                  <div className="text-sm font-bold text-slate-500">NEXT</div>
                  <div className="flex justify-center items-baseline gap-4 mt-2">
                    {queue.next.length > 0 ? (
                      queue.next.slice(0, 3).map((appt, index) => (
                        <span key={appt.id} className={`font-bold ${index === 0 ? 'text-4xl text-slate-800' : 'text-3xl text-slate-500'}`}>
                          {appt.token_number}
                        </span>
                      ))
                    ) : (
                      <span className="text-2xl font-bold text-slate-400">-</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 text-sm text-slate-600 font-medium">
                <div className="flex justify-between items-center">
                  <span>Room: <span className="font-bold text-slate-800">{queue.room_number || 'N/A'}</span></span>
                  {queue.delay_minutes > 0 && <span className="font-bold text-red-600">Delayed</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        {queues.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 py-20 text-center text-slate-500">No doctors are scheduled for today.</div>
        )}
      </main>
      <footer className="mx-auto max-w-[1800px] p-3 md:px-6 md:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 flex items-center gap-3">
            <span className="text-blue-600 text-3xl">📢</span>
            <span className="font-medium text-slate-700">Please maintain silence. Do not crowd the counter.</span>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 flex items-center gap-3">
            <span className="text-blue-600 text-3xl">💧</span>
            <span className="font-medium text-slate-700">Health Tip: Drink plenty of water throughout the day.</span>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 flex items-center gap-3">
            <span className="text-blue-600 text-3xl">ℹ️</span>
            <span className="font-medium text-slate-700">Consultation time may vary. Emergency patients get priority.</span>
          </div>
        </div>
        <div className="mt-4 px-6 py-3 rounded-2xl text-center text-sm text-white" style={{ backgroundColor: '#0F3D91' }}>
          Thank you for your patience. Powered by Clinqo.
        </div>
        <button onClick={() => navigate('/display/select-doctor')} className="mt-6 text-sm text-slate-500 hover:underline">
          ← Back to Display Selection
        </button>
      </footer>
    </div>
  );
}