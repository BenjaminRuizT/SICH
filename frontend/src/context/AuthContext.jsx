import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('siche_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(r => { setUser(r.data); localStorage.setItem('siche_user', JSON.stringify(r.data)); })
      .catch(() => { setUser(null); localStorage.removeItem('siche_user'); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const r = await api.post('/auth/login', { username, password });
    setUser(r.data);
    localStorage.setItem('siche_user', JSON.stringify(r.data));
    return r.data;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
    localStorage.removeItem('siche_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default api;
