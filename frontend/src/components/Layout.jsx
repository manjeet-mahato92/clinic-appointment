import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Layout({ title, navItems, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hospital, setHospital] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fetchHospital = async () => {
      try {
        if (user?.role === 'hospital') {
          const { data } = await api.get('/hospital/profile');
          setHospital(data);
        } else if (user?.role === 'doctor') {
          const { data } = await api.get('/doctor/hospital');
          setHospital(data);
        }
      } catch (err) {
        setHospital(null);
      }
    };
    fetchHospital();
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, [user]);

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Desktop / large sidebar */}
      <aside className={`hidden md:flex md:w-64 bg-ink text-white flex-col shrink-0`}> 
        <div className="px-6 py-6 border-b border-white/10">
          <div className="font-display font-semibold text-lg leading-tight">Clinic Token</div>
          <div className="text-xs text-white/50 mt-0.5">{title}</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-clinical text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-sm font-medium truncate">{user?.name}</div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="mt-2 text-xs text-white/60 hover:text-white underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header with hamburger */}
      <div className="md:hidden fixed inset-x-0 top-0 z-30 bg-ink px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            aria-label="Toggle menu"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md bg-white/5 text-ink"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="font-display font-semibold text-lg text-white">Clinic Token</div>
        </div>
      </div>

      {/* Mobile overlay sidebar */}
      <div className={`fixed inset-0 z-40 md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
        />
        <aside className={`absolute left-0 top-0 bottom-0 w-64 bg-ink text-white transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="font-display font-semibold text-lg leading-tight">Clinic Token</div>
              <div className="text-xs text-white/50 mt-0.5">{title}</div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-2 rounded-md bg-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 8.586l4.95-4.95 1.414 1.414L11.414 10l4.95 4.95-1.414 1.414L10 11.414l-4.95 4.95-1.414-1.414L8.586 10 3.636 5.05 5.05 3.636 10 8.586z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <nav className="px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-clinical text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 py-4 border-t border-white/10">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="mt-2 text-xs text-white/60 hover:text-white underline underline-offset-2"
            >
              Sign out
            </button>
          </div>
        </aside>
      </div>

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {hospital && (
          <header
            className="border-b border-white/10 px-4 md:px-8 py-4 md:py-5 text-white sticky z-20 md:mb-2" 
          >
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center">
                  {hospital.logo_url ? <img src={hospital.logo_url} alt="{hospital.hospital_name}" className="object-cover" /> : <span className="text-white/70">LOGO</span>}
                </div>
                {/* <div className="text-lg md:text-3xl font-semibold leading-tight">Welcome to {hospital.hospital_name}</div> */}
              </div>
              
            </div>
          </header>
        )}
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 mt-4 md:mt-6">{children}</div>
      </main>
    </div>
  );
}
