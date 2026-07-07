import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('ctm_user');
    if (raw) return JSON.parse(raw);

    if (window.location.pathname.startsWith('/display')) {
      const tempToken = localStorage.getItem('ctm_temp_display_token');
      const tempUserRaw = localStorage.getItem('ctm_temp_display_user');
      if (tempToken && tempUserRaw) {
        return JSON.parse(tempUserRaw);
      }
    }
    return null;
  });
  const navigate = useNavigate();

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
    if (role === 'doctor' && data.user) {
      resolvedUser.photo_url = data.user.photo_url;
    }
    localStorage.setItem('ctm_user', JSON.stringify(resolvedUser));
    setUser(resolvedUser);
    return resolvedUser;
  }, []);

  const loginWithToken = useCallback((token, userToImpersonate) => {
    localStorage.setItem('ctm_token', token);
    localStorage.setItem('ctm_user', JSON.stringify(userToImpersonate));
    setUser(userToImpersonate);
    navigate(userToImpersonate.role === 'display' ? '/display/select-doctor' : '/hospital');
  }, [navigate]);

  const updateUser = useCallback((updates) => {
    setUser(currentUser => {
      const updatedUser = { ...currentUser, ...updates };
      localStorage.setItem('ctm_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ctm_token');
    localStorage.removeItem('ctm_user');
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout, updateUser, loginWithToken }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
