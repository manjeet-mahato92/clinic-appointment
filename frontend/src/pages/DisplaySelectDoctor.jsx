import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function DisplaySelectDoctor() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    let active = true;

    const loadDoctors = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/display/doctors');
        if (active) setDoctors(response.data);
      } catch (err) {
        if (active) {
          setDoctors([]);
          setError(err.response?.data?.error || 'Could not load doctors. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDoctors();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const leaveDisplay = () => {
    if (user?.role === 'hospital') {
      navigate('/hospital');
      return;
    }
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="card p-6 text-left">
          <div className="text-slate-soft text-xs uppercase tracking-wide mb-2">Display Control</div>
          <h1 className="text-2xl font-semibold text-ink">{user?.name}</h1>
          <p className="text-slate-soft mt-1">Open the combined queue board or select one doctor.</p>
        </div>

        <div className="grid gap-3">
          {loading && (
            <div className="card border border-slate-200 text-slate-soft text-center py-8">
              Loading today&apos;s doctors…
            </div>
          )}
          {!loading && error && (
            <div className="card border border-red-200 bg-red-50 text-center py-8 px-5" role="alert">
              <div className="text-danger text-sm">{error}</div>
              <button type="button" className="btn-secondary mt-4" onClick={() => setReloadKey((key) => key + 1)}>
                Try again
              </button>
            </div>
          )}
          {!loading && !error && (
            <button
              type="button"
              onClick={() => navigate('/display/board-all')}
              className="rounded-2xl border border-green-700 bg-green-700 p-5 text-left text-white shadow-sm transition-colors hover:bg-green-800"
            >
              <div className="text-lg font-bold">All Doctors Display</div>
              <div className="mt-1 text-sm text-white/80">
                Current patient, upcoming token numbers, and room for every available doctor.
              </div>
            </button>
          )}
          {!loading && !error && doctors.length > 0 && (
            <div className="flex items-center gap-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              Single doctor
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          )}
          {!loading && !error && doctors.map((d) => (
            <button
              key={d.id}
              onClick={() => navigate(`/display/board/${d.id}`)}
              className="card text-left border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="font-semibold text-ink">{d.doctor_name}</div>
              <div className="text-slate-soft text-sm mt-1">{d.speciality || 'General clinic'}</div>
            </button>
          ))}
          {!loading && !error && !doctors.length && (
            <div className="card border border-slate-200 text-slate-soft text-center py-8 px-5">
              No active doctors are scheduled for today.
            </div>
          )}
        </div>

        <button onClick={leaveDisplay} className="w-full text-center text-slate-500 text-sm underline">
          {user?.role === 'hospital' ? 'Back to hospital dashboard' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
