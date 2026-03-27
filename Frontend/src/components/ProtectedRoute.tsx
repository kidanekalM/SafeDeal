import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { isProfileComplete } from '../utils/profileUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Allow access to profile page regardless of completeness
  // but redirect to profile for everything else if incomplete
  if (!isProfileComplete(user) && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace state={{ from: location, needsOnboarding: true }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
