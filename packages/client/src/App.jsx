import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccessibilityProvider, GuestAccessibilityInit } from '@/contexts/AccessibilityContext';
import { ToastProvider } from '@/components/ui/toast';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { useAuthStore } from '@/stores/authStore';
import { AppRoutes } from '@/routes/AppRoutes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthBootstrap({ children }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <GuestAccessibilityInit />
          <AuthBootstrap>
            <AccessibilityProvider>
              <ToastProvider>
                <AppRoutes />
              </ToastProvider>
            </AccessibilityProvider>
          </AuthBootstrap>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
