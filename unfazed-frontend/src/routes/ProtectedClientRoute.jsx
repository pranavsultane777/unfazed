import { Navigate, useLocation } from 'react-router-dom';
import { useClientAuth } from '../context/ClientAuthContext';

const ProtectedClientRoute = ({ children }) => {
  const { client } = useClientAuth();
  const location = useLocation();
  const token = localStorage.getItem('clientToken');

  if (!client || !token) {
    return <Navigate to="/client/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedClientRoute;
