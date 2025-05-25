'use client';

import { SessionProvider } from 'next-auth/react';

export default function Layout({ children }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-900 text-gray-100 font-mono p-8 md:p-16">
        {children}
      </div>
    </SessionProvider>
  );
}
