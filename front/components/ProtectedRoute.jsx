'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';
import { useSession } from 'next-auth/react';

const ProtectedRoute = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/');
  }, [session, status, router]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (!session) {
    router.push('/');
  }

  // If loading is finished AND a user exists, render the children.
  return <>{children}</>;
};

export default ProtectedRoute;
