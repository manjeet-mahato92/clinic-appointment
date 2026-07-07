import { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout.jsx';
import { superAdminNav } from '../navConfigs.js';
import api from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { STATES, LOCATIONS } from '../utils/locations.js';

export default function SuperAdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ state: '', district: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = setTimeout(() => {
      setLoading(true);
      const params = { q: searchQuery, ...filters };
      api.get('/super-admin/doctors', { params })
        .then((r) => setDoctors(r.data))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, filters]);

  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, ...(k === 'state' && { district: '' }) }));

  const filteredDoctors = useMemo(() => {
    // Filtering is now done on the backend, this memo is for potential future client-side needs.
    // For now, it just returns the data as-is from the API.
    if (!searchQuery && !filters.state && !filters.district) {
      return doctors;
    }
    // The backend performs the filtering, so we can just return the result.
    // A more complex implementation might do client-side filtering on top of backend results.
    return doctors;
  }, [doctors, searchQuery, filters]);

  return (
    <Layout title="Super Admin" navItems={superAdminNav}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">All Doctors</h1>
          <p className="text-slate-soft">A complete list of all doctors across all registered clinics.</p>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input
            className="input lg:col-span-2"
            placeholder="Search by doctor, speciality, hospital, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select className="input" value={filters.state} onChange={setFilter('state')}>
            <option value="">All States</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={filters.district} onChange={setFilter('district')} disabled={!filters.state}>
            <option value="">All Districts</option>
            {(LOCATIONS[filters.state] || []).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <button className="btn-secondary" onClick={() => { setSearchQuery(''); setFilters({ state: '', district: '' }); }}>Clear Filters</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper text-slate-soft text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Doctor</th>
                <th className="text-left px-5 py-3">Hospital / Clinic</th>
                <th className="text-left px-5 py-3">Contact</th>
                <th className="text-left px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={4} className="text-center py-10 text-slate-soft">Loading doctors...</td></tr>
              )}
              {!loading && filteredDoctors.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-ink">{d.doctor_name}</div>
                    <div className="text-xs text-slate-soft">{d.speciality || 'General Practice'}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-soft font-medium">{d.hospital_name}</td>
                  <td className="px-5 py-4 text-slate-soft">
                    <div>{d.email}</div>
                    <div className="text-xs">{d.contact_number || ''}</div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
              {!loading && !filteredDoctors.length && (
                <tr><td colSpan={4} className="text-center py-10 text-slate-soft">{searchQuery || filters.state ? 'No doctors match your criteria.' : 'No doctors found.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}