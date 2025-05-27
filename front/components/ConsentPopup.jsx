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
import { db } from '@/lib/firebase'; // Make sure db (Firestore instance) is exported from firebase.js
import {
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  deleteDoc,
  getDoc, // Added getDoc
} from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';

export default function ConsentPopup() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(false);
  const [wantsToCreateOrg, setWantsToCreateOrg] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingConsent, setIsCheckingConsent] = useState(true); // To manage initial loading state

  useEffect(() => {
    const checkConsentStatus = async () => {
      if (user) {
        setIsCheckingConsent(true);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists() && userDocSnap.data().cookieConsentGiven === true) {
            setIsOpen(false); // User has already consented
          } else {
            setIsOpen(true); // Show popup if no doc or no/false consent
          }
        } catch (err) {
          console.error("Error fetching user consent status:", err);
          setError("Could not verify your consent status. Please try again or contact support.");
          setIsOpen(true); // Fallback to showing popup on error to ensure consent is eventually captured
        } finally {
          setIsCheckingConsent(false);
        }
      } else {
        setIsOpen(false); // No user, no popup
        setIsCheckingConsent(false);
      }
    };

    checkConsentStatus();
  }, [user]); // Effect runs when user object becomes available

  const closePopup = () => {
    setIsOpen(false);
    setError('');
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('User not authenticated. Please refresh.');
      return;
    }

    if (!cookieConsent) {
      setError('You must agree to the use of essential cookies to continue.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', user.uid);

      // 1. Store cookie consent and basic user info (create or update)
      const userDataToSet = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null, // Ensure displayName is included
        cookieConsentGiven: cookieConsent,
        preferencesLastUpdatedAt: serverTimestamp(),
      };
      // If it's the first time, also set createdAt
      // For simplicity, setDoc with merge will handle this well.
      // We can add createdAt if we check if the doc exists first, or rely on a separate signup function to create it.
      // For now, this ensures preferences are updated/set.
      await setDoc(userRef, userDataToSet, { merge: true });

      // 2. Handle organization creation
      if (wantsToCreateOrg && organizationName.trim() !== '') {
        const newOrgRef = await addDoc(collection(db, 'organizations'), {
          name: organizationName.trim(),
          ownerId: user.uid,
          members: [user.uid], // Owner is the first member
          createdAt: serverTimestamp(),
        });

        // Link user to this organization
        await setDoc(
          userRef,
          {
            organizationId: newOrgRef.id,
            organizationName: organizationName.trim(), // Denormalize for easier display
          },
          { merge: true },
        );
      }

      closePopup();
    } catch (err) {
      console.error('Error saving preferences: ', err);
      setError(`Failed to save preferences: ${err.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExitAndDeleteProfile = async () => {
    if (!user) {
      setError('User not authenticated. Cannot delete profile.');
      return;
    }

    // Optional: Add a window.confirm for better UX, though not explicitly requested.
    // const confirmed = window.confirm("Are you sure you want to delete your profile and all associated data? This action cannot be undone.");
    // if (!confirmed) return;

    setIsLoading(true);
    setError('');

    try {
      const userId = user.uid; // Store UID before user object is potentially invalidated

      // 1. Delete Firebase Auth user
      // This will also sign the user out. The AuthProvider should handle the redirect.
      await user.delete();

      // 2. Delete Firestore data for the user
      const userDocRef = doc(db, 'users', userId);
      await deleteDoc(userDocRef);

      // No need to setIsOpen(false) here, as the user session will end,
      // and useEffect will close the dialog if `user` becomes null.
      // localStorage key is not set, which is correct.
    } catch (err) {
      console.error('Error deleting profile: ', err);
      let errorMessage = `Failed to delete profile: ${err.message}.`;
      if (err.code === 'auth/requires-recent-login') {
        errorMessage =
          'This operation is sensitive and requires recent authentication. Please sign out, sign back in, and try again.';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || isCheckingConsent) { // Don't render if not open or still checking consent
    return null;
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="sm:max-w-[525px] bg-gray-800 border-gray-700 text-gray-100 font-mono"
        onEscapeKeyDown={(e) => e.preventDefault()} // Prevent closing on Escape key
        onPointerDownOutside={(e) => e.preventDefault()} // Prevent closing on overlay click
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-50">
            Welcome to Reomir!
          </DialogTitle>
          <DialogDescription className="text-gray-400 pt-2">
            Help us tailor your experience. Your preferences will be saved.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="cookieConsent"
              checked={cookieConsent}
              onCheckedChange={(checked) => setCookieConsent(!!checked)}
              className="mt-1 border-gray-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 data-[state=checked]:text-white focus-visible:ring-indigo-500"
            />
            <Label
              htmlFor="cookieConsent"
              className="text-sm font-normal text-gray-300"
            >
              I agree to the use of essential cookies to ensure the proper
              functioning of this application.
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="createOrg"
              checked={wantsToCreateOrg}
              onCheckedChange={(checked) => setWantsToCreateOrg(!!checked)}
              className="mt-1 border-gray-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 data-[state=checked]:text-white focus-visible:ring-indigo-500"
            />
            <Label
              htmlFor="createOrg"
              className="text-sm font-normal text-gray-300"
            >
              I'd like to create a new organization to manage projects and team
              members.
            </Label>
          </div>

          {wantsToCreateOrg && (
            <div className="grid gap-2 pl-6">
              {' '}
              {/* Indent org name input */}
              <Label htmlFor="organizationName" className="text-gray-400">
                Organization Name
              </Label>
              <Input
                id="organizationName"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g., Innovatech Solutions"
                className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500"
                disabled={isLoading}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 px-1 py-2 bg-red-900/30 rounded-md border border-red-700">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="sm:justify-between gap-2">
          <Button
            variant="outline"
            onClick={handleExitAndDeleteProfile}
            className="text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white"
            disabled={isLoading}
          >
            Exit & Delete Profile
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !cookieConsent ||
              (wantsToCreateOrg && organizationName.trim() === '')
            }
            className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-600"
          >
            {isLoading ? 'Saving...' : 'Save & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
