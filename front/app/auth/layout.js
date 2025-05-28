'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
// import ConsentPopup from '@/components/ConsentPopup';
import { SessionProvider } from 'next-auth/react';

export default function Layout({ children }) {
  return (
    <SessionProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-900 text-gray-100 font-mono p-8 md:p-20">
          <Sidebar />
          {children}
        </div>
      </ProtectedRoute>
    </SessionProvider>
  );
}
