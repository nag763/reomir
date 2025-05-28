'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import GoogleIcon from './GoogleIcon';
import { signIn } from 'next-auth/react';

const CtaSection = () => {
  const handleLoginClick = async () => {
    signIn('google', {
      callbackUrl: '/auth/dashboard',
    });
  };

  return (
    <section className="bg-gray-800 p-8 md:p-12 rounded-lg shadow-2xl text-center border border-gray-700">
      <Search className="h-10 w-10 text-indigo-400 mx-auto mb-4" />
      <h2 className="text-2xl md:text-3xl font-bold mb-4">
        Ready to Boost Your Dev Workflow?
      </h2>
      <p className="text-gray-400 mb-8 max-w-lg mx-auto">
        See how Reomir can centralize your tools, secure your code, and empower
        your team. Log in to explore.
      </p>
      <Button
        size="lg"
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg transform hover:scale-105 transition-transform"
        onClick={handleLoginClick}
      >
        <GoogleIcon />
        Login with Google & Try Reomir
      </Button>
      <p className="mt-6 text-xs text-gray-600">
        {`// Authentication via Google OAuth required...`}
      </p>
    </section>
  );
};

export default CtaSection;
