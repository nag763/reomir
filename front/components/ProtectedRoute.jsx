'use client';

import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingScreen from '@/components/LoadingScreen';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth state is determined (not loading) and there's no user, redirect.
    if (!loading && !user) {
      router.push('/'); // Redirect to homepage 
    }
  }, [user, loading, router]);

  // If still loading or if there's no user yet (will redirect soon), show loading.
  if (loading || !user) {
    return <LoadingScreen />;
  }

  // If loading is finished AND a user exists, render the children.
  return <>{children}</>;
};

export default ProtectedRoute;