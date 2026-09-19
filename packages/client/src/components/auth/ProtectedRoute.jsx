import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * While the session is being restored we do not yet know whether this person
 * is signed in, so we cannot redirect without risking bouncing a signed-in
 * learner to the login page on every refresh. A skeleton holds the space
 * instead, and the wait is announced politely.
 */
function RestoringSession() {
  return (
    <div className="page-container" role="status" aria-live="polite">
      <span className="sr-only">Checking whether you are signed in</span>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-5 w-80" />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, adminOnly = false }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const profile = useAuthStore((s) => s.profile);
  const location = useLocation();

  if (isLoading) return <RestoringSession />;

  if (!isAuthenticated) {
    // Carry both where they were going and why they were sent away, so the
    // login page can explain itself and return them afterwards.
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname, message: 'Please sign in to continue.' }}
        replace
      />
    );
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
