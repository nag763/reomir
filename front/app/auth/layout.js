'use client';
import { AuthProvider } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';

export default function Layout({ children }) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-900 text-gray-100 font-mono p-8 md:p-20">
          <Sidebar />
          {children}
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
}
