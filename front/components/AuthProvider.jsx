'use client';

import React, { createContext, useContext } from 'react';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import LoadingScreen from '@/components/LoadingScreen';

const AuthContext = createContext({ user: null, loading: true, error: null });

export const AuthProvider = ({ children }) => {
  const [user, loading, error] = useAuthState(auth);

  // Don't render children until auth state is determined
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
