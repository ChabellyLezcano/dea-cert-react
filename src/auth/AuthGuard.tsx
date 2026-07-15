import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { PageSpinner } from '../shared/components/PageSpinner';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageSpinner label="Restoring your session..." />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
