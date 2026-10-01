import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { therapist } = useAuth();
  const location = useLocation();

  const token =
    localStorage.getItem('therapistToken') ||
    localStorage.getItem('token');

  if (!therapist || !token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;