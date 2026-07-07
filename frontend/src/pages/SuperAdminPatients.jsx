import { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout.jsx';
import { superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';
import { STATES, LOCATIONS } from '../utils/locations.js';

export default function SuperAdminPatients() {
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ state: '', district: '', gender: '', sortBy: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = setTimeout(() => {
      setLoading(true);
      const params = { q: searchQuery, ...filters };
      api.get('/super-admin/patients', { params })
        .then((r) => setPatients(r.data))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, filters]);

  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, ...(k === 'state' && { district: '' }) }));

  return (
    <Layout title="Super Admin" navItems={superAdminNav}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">All Patients</h1>
          <p className="text-slate-soft">A complete list of all patients across all registered clinics.</p>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <input className="input lg:col-span-2" placeholder="Search by name, phone, or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
          <button className="btn-secondary" onClick={() => { setSearchQuery(''); setFilters({ state: '', district: '', gender: '', sortBy: '' }); }}>Clear Filters</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper text-slate-soft text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Hospital / Clinic</th>
                <th className="text-left px-5 py-3">Contact</th>
                <th className="text-left px-5 py-3">Visits</th>
                <th className="text-left px-5 py-3">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={5} className="text-center py-10 text-slate-soft">Loading patients...</td></tr>
              )}
              {!loading && patients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-ink">{p.patient_name}</div>
                    <div className="text-xs text-slate-soft">{p.gender}, {p.age || 'N/A'} yrs</div>
                  </td>
                  <td className="px-5 py-4 text-slate-soft font-medium">{p.hospital_name}</td>
                  <td className="px-5 py-4 text-slate-soft">
                    <div>{p.contact_number}</div>
                    <div className="text-xs">{p.email || ''}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-soft font-semibold">{p.appointment_count}</td>
                  <td className="px-5 py-4 text-slate-soft">{[p.district, p.state].filter(Boolean).join(', ')}</td>
                </tr>
              ))}
              {!loading && !patients.length && (
                <tr><td colSpan={5} className="text-center py-10 text-slate-soft">{searchQuery || filters.state ? 'No patients match your criteria.' : 'No patients found.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}