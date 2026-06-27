import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const isAuth = sessionStorage.getItem('isBackOfficeAuth') === 'true';
  return isAuth ? children : <Navigate to="/" replace />;
}
