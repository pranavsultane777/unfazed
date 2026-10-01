import { createContext, useContext, useEffect, useState } from 'react';

const ClientAuthContext = createContext(null);

const readStoredClient = () => {
  try {
    const stored = localStorage.getItem('client');
    const token = localStorage.getItem('clientToken');
    return stored && token ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('client');
    return null;
  }
};

export const ClientAuthProvider = ({ children }) => {
  const [client, setClient] = useState(readStoredClient);

  const loginClient = (clientData) => {
    const { token, ...rest } = clientData || {};
    if (!token) throw new Error('Authentication token was not returned by the server.');
    localStorage.setItem('clientToken', token);
    localStorage.setItem('client', JSON.stringify(rest));
    setClient(rest);
  };

  const logoutClient = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('client');
    setClient(null);
  };

  useEffect(() => {
    const handleExpired = () => logoutClient();
    window.addEventListener('client-auth-expired', handleExpired);
    return () => window.removeEventListener('client-auth-expired', handleExpired);
  }, []);

  return <ClientAuthContext.Provider value={{ client, loginClient, logoutClient }}>{children}</ClientAuthContext.Provider>;
};

export const useClientAuth = () => useContext(ClientAuthContext);
