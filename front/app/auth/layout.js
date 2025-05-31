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
          <main className="min-h-screen bg-gray-900 text-gray-100 font-mono flex flex-1 flex-col h-screen overflow-auto">
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
