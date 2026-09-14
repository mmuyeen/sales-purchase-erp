import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Gates any authenticated screen — unauthenticated visitors are sent to
// Login. Shown routes never even attempt their data fetch while the
// session-restoration check is still in flight, avoiding a flash of
// protected content before a redirect.
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Keeps an already-logged-in user off Login/Register (sends them to the
// dashboard instead of showing the auth forms again).
export function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}
