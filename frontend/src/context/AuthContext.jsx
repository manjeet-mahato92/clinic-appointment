import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('ctm_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (role, credentials) => {
    const endpointByRole = {
      super_admin: '/auth/super-admin/login',
      hospital: '/auth/hospital/login',
      doctor: '/auth/doctor/login',
      display: '/auth/display/login',
    };
    const { data } = await api.post(endpointByRole[role], credentials);
    localStorage.setItem('ctm_token', data.token);
    const resolvedUser = data.user || (role === 'display'
      ? { role: 'display', id: data.hospital.id, name: data.hospital.name, logo_url: data.hospital.logo_url }
      : null);
    localStorage.setItem('ctm_user', JSON.stringify(resolvedUser));
    setUser(resolvedUser);
    return resolvedUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ctm_token');
    localStorage.removeItem('ctm_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
