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
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-8 text-center shadow-2xl md:p-12">
      <Search className="mx-auto mb-4 h-10 w-10 text-indigo-400" />
      <h2 className="mb-4 text-2xl font-bold md:text-3xl">
        Ready to Boost Your Dev Workflow?
      </h2>
      <p className="mx-auto mb-8 max-w-lg text-gray-400">
        See how Reomir can centralize your tools, secure your code, and empower
        your team. Log in to explore.
      </p>
      <Button
        size="lg"
        className="transform cursor-pointer bg-indigo-600 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-700"
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
