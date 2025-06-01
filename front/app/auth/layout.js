'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SessionProvider } from 'next-auth/react';
import { UserProfileProvider } from '@/components/UserProfileProvider';
import ConsentPopup from '@/components/ConsentPopup';
import { Toaster } from '@/components/ui/toaster';
import TopBar from '@/components/TopBar';

export default function Layout({ children }) {
  return (
    <SessionProvider>
      <UserProfileProvider>
        <ProtectedRoute>
          <main className="flex h-screen min-h-screen flex-1 flex-col overflow-auto bg-gray-900 font-mono text-gray-100">
            <TopBar />
            {children}
          </main>
          <ConsentPopup />
          <Toaster />
        </ProtectedRoute>
      </UserProfileProvider>
    </SessionProvider>
  );
}
