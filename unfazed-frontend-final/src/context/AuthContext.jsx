import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

const readStoredTherapist = () => {
  try {
    const stored = localStorage.getItem('therapist');
    const token = localStorage.getItem('therapistToken') || localStorage.getItem('token');
    return stored && token ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('therapist');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [therapist, setTherapist] = useState(readStoredTherapist);

  const login = (therapistData) => {
    const { token, ...rest } = therapistData || {};
    if (!token) throw new Error('Authentication token was not returned by the server.');
    localStorage.setItem('therapistToken', token);
    localStorage.setItem('token', token);
    localStorage.setItem('therapist', JSON.stringify(rest));
    setTherapist(rest);
  };

  const updateTherapist = (data) => {
    const next = data || {};
    localStorage.setItem('therapist', JSON.stringify(next));
    setTherapist(next);
  };

  const logout = () => {
    localStorage.removeItem('therapistToken');
    localStorage.removeItem('token');
    localStorage.removeItem('therapist');
    setTherapist(null);
  };

  useEffect(() => {
    const handleExpired = () => logout();
    window.addEventListener('auth-expired', handleExpired);
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, []);

  return <AuthContext.Provider value={{ therapist, login, updateTherapist, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
