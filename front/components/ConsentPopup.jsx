'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signOut as nextAuthSignOut, useSession } from 'next-auth/react'; // Use next-auth
import { useUserProfile } from '@/components/UserProfileProvider'; // Your context for profile data
import { callAuthenticatedApi } from '@/lib/apiClient'; // Your API client
import { useRouter } from 'next/navigation';

/**
 * @file Renders a modal dialog to manage user consent for cookies and
 * optionally allow them to create an organization.
 * It interacts with NextAuth for session data and UserProfileProvider for profile updates.
 * The dialog is displayed based on the user's authentication status and consent state
 * stored in their profile.
 */
export default function ConsentPopup() {
  // session for auth status, profile for app-specific data including consent
  const { data: session, status: sessionStatus } = useSession();
  const { profile, isLoadingProfile, profileError, updateProfile } =
    useUserProfile();

  const [isOpen, setIsOpen] = useState(false);
  const [hasAgreedToCookies, setHasAgreedToCookies] = useState(false);
  const [wantsToCreateOrg, setWantsToCreateOrg] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Determine if popup should be open based on session and profile data
    if (sessionStatus === 'authenticated' && !isLoadingProfile) {
      if (profileError) {
        // If there was an error fetching profile, probably show popup to try again
        // or handle error more gracefully elsewhere. For now, show it.
        setError('Could not load your profile settings. Please try again.');
        setIsOpen(true);
      } else if (!profile) {
        console.log(
          "ConsentPopup: Profile missing or consent not 'true'. Opening popup.",
          profile,
        );
        setIsOpen(true);
      } else {
        // User is authenticated, profile loaded, and consent is 'true'
        setIsOpen(false);
      }
    } else if (sessionStatus === 'unauthenticated') {
      setIsOpen(false); // No user, no popup
    }
    // If sessionStatus is 'loading', UserProfileProvider will show a global loader.
  }, [sessionStatus, profile, isLoadingProfile, profileError]);

  const closePopup = () => {
    setIsOpen(false);
    setError('');
  };

  const handleSubmit = async () => {
    if (sessionStatus !== 'authenticated') {
      setError('User not authenticated. Please refresh.');
      return;
    }

    if (!hasAgreedToCookies) {
      setError('You must agree to the use of essential cookies to continue.');
      return;
    }
    if (wantsToCreateOrg && organizationName.trim() === '') {
      setError(
        'Please enter an organization name or uncheck the option to create one.',
      );
      return;
    }

    setIsSubmitting(true);
    setError('');

    const payload = {
      cookieConsent: 'true', // String 'true' as requested
    };

    if (wantsToCreateOrg) {
      payload.organizationName = organizationName.trim();
    }

    try {
      // API endpoint to update user's consent and potentially organization
      // This endpoint should exist on your reomir-agent, exposed via API Gateway
      await updateProfile({ cookieConsent: 'true' });
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err.message || 'Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDenyAndSignOut = async () => {
    setIsSubmitting(true); // Use isSubmitting to disable buttons
    await nextAuthSignOut({ callbackUrl: '/' }); // Use next-auth signOut
    // No need to setIsOpen(false) explicitly, session change will trigger useEffect
    setIsSubmitting(false);
  };

  // If popup shouldn't be open, or global loading is happening (handled by UserProfileProvider)
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && hasAgreedToCookies)
          setIsOpen(false); /* Allow closing if consent given */
      }}
    >
      {/* Keep it modal if consent is not yet given */}
      <DialogContent
        className="border-gray-700 bg-gray-800 font-mono text-gray-100 sm:max-w-[525px]"
        onEscapeKeyDown={(e) => {
          if (!profile?.cookieConsent) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (!profile?.cookieConsent) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-50">
            Welcome to Reomir!
          </DialogTitle>
          <DialogDescription className="pt-2 text-gray-400">
            To continue, please confirm your cookie preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="cookieConsent"
              checked={hasAgreedToCookies}
              onCheckedChange={(checked) => setHasAgreedToCookies(!!checked)}
              className="mt-1 border-gray-500 focus-visible:ring-indigo-500 data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white"
            />
            <Label
              htmlFor="cookieConsent"
              className="text-sm font-normal text-gray-300"
            >
              I agree to the use of essential cookies for application
              functionality.
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="createOrg"
              checked={wantsToCreateOrg}
              onCheckedChange={(checked) => setWantsToCreateOrg(!!checked)}
              className="mt-1 border-gray-500 focus-visible:ring-indigo-500 data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white"
              disabled={!hasAgreedToCookies || isSubmitting}
            />
            <Label
              htmlFor="createOrg"
              className="text-sm font-normal text-gray-300"
            >
              I&apos;d like to create a new organization (optional).
            </Label>
          </div>

          {wantsToCreateOrg && hasAgreedToCookies && (
            <div className="grid gap-2 pl-6">
              <Label htmlFor="organizationName" className="text-gray-400">
                Organization Name
              </Label>
              <Input
                id="organizationName"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g., My Awesome Org"
                className="border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-500"
                disabled={isSubmitting}
              />
            </div>
          )}

          {error && (
            <p className="rounded-md border border-red-700 bg-red-900/30 px-1 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={handleDenyAndSignOut}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Deny & Sign Out
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !hasAgreedToCookies ||
              (wantsToCreateOrg && organizationName.trim() === '')
            }
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Saving...' : 'Save & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
