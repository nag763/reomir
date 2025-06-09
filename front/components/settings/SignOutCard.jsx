// front/components/settings/SignOutCard.jsx
import React, { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { LogOut } from 'lucide-react';

export const SignOutCard = ({ showFeedback }) => {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // signOut typically redirects and doesn't throw for most "errors" post-initiation,
      // but errors can occur if NextAuth endpoint itself has an issue before redirect.
      await signOut({ callbackUrl: '/' });
      // If signOut itself fails critically before redirecting (e.g. server unavailable),
      // it might throw or the user won't be redirected.
      // However, usually, this line below won't be reached if redirect is successful.
    } catch (error) {
      console.error('Sign out error:', error);
      showFeedback(
        `Error signing out: ${error.message || 'An unexpected error occurred.'}`,
        'error',
      );
      setIsSigningOut(false); // Reset state only if error occurs and no redirect
    }
    // Note: If signOut successfully initiates redirect, the component will unmount,
    // so setIsSigningOut(false) might not be strictly necessary if successful.
    // However, keeping it for robustness in case of non-redirecting failures.
  };

  return (
    <Card className="border-gray-700 bg-gray-800 text-gray-100">
      <CardHeader>
        <CardTitle className="text-xl">Sign Out</CardTitle>
        <CardDescription className="text-gray-400">
          End your current session.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full sm:w-auto" // Maintain original styling for width
        >
          {isSigningOut ? (
            'Signing Out...'
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
