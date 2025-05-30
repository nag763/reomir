'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { SessionProvider } from 'next-auth/react';
import { UserProfileProvider } from '@/components/UserProfileProvider';
import ConsentPopup from '@/components/ConsentPopup';
import { Toaster } from '@/components/ui/toaster';

export default function Layout({ children }) {
  return (
    <SessionProvider>
      <UserProfileProvider>
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-900 text-gray-100 font-mono p-8 md:p-20">
            <Sidebar />
            <ConsentPopup />
            <Toaster />
            {children}
          </div>
        </ProtectedRoute>
      </UserProfileProvider>
    </SessionProvider>
  );
}
