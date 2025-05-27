'use client';
import { AuthProvider } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import ConsentPopup from '@/components/ConsentPopup';

export default function Layout({ children }) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-900 text-gray-100 font-mono p-8 md:p-20">
          <ConsentPopup />
          <Sidebar />
          {children}
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
}
