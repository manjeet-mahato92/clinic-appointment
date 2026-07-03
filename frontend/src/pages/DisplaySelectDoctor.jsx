import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function DisplaySelectDoctor() {
  const [doctors, setDoctors] = useState([]);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    api.get('/display/doctors').then((r) => setDoctors(r.data));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="card p-6 text-left">
          <div className="text-slate-soft text-xs uppercase tracking-wide mb-2">Display Control</div>
          <h1 className="text-2xl font-semibold text-ink">{user?.name}</h1>
          <p className="text-slate-soft mt-1">Select a doctor to open the display board for that clinic.</p>
        </div>

        <div className="grid gap-3">
          {doctors.map((d) => (
            <button
              key={d.id}
              onClick={() => navigate(`/display/board/${d.id}`)}
              className="card text-left border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="font-semibold text-ink">{d.doctor_name}</div>
              <div className="text-slate-soft text-sm mt-1">{d.speciality || 'General clinic'}</div>
            </button>
          ))}
          {!doctors.length && <div className="card border border-slate-200 text-slate-soft text-center py-8">No active doctors found for this clinic.</div>}
        </div>

        <button onClick={() => { logout(); navigate('/login'); }} className="w-full text-center text-slate-500 text-sm underline">
          Sign out
        </button>
      </div>
    </div>
  );
}
