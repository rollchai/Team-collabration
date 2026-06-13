import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { loadMe } from '../redux/slices/authSlice';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { token, user, isAuthenticated, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    if (token && !user) {
      dispatch(loadMe());
    }
  }, [token, user, dispatch]);

  if (loading || (token && !user)) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors">
        <Loader2 className="h-10 w-10 animate-spin text-green-500" />
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading collaboration session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated && !token) {
    // Redirect to login but save current location to return to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
