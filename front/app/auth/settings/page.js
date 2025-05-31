// settings/page.js
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FeedbackAlert } from '@/components/FeedbackAlert'; // Suggested import
import { User, Trash2, AlertTriangle, LogOut } from 'lucide-react';
import { useUserProfile } from '@/components/UserProfileProvider';
import { signOut, useSession } from 'next-auth/react';

const FEEDBACK_TIMEOUT = 3000;

export default function SettingsPage() {
  const { data: session } = useSession();
  const { profile, updateProfile, deleteProfile } = useUserProfile();

  const [confirmInput, setConfirmInput] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: 'info' });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const inputRef = useRef(null);

  const derivedUser = {
    name: profile?.displayName || session?.user?.name || 'User',
    email: session?.user?.email || '',
    image: session?.user?.image || null,
  };

  useEffect(() => {
    document.title = 'Settings';
  }, []);

  useEffect(() => {
    // Initialize newDisplayName when profile data is available or changes
    if (profile || session?.user) {
      setNewDisplayName(profile?.displayName || session?.user?.name || '');
    }
  }, [profile, session?.user]);

  useEffect(() => {
    if (isEditingProfile && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditingProfile]);

  useEffect(() => {
    if (feedback.message) {
      const timer = setTimeout(
        () => setFeedback({ message: '', type: 'info' }),
        FEEDBACK_TIMEOUT,
      );
      return () => clearTimeout(timer);
    }
  }, [feedback.message]);

  const handleProfileUpdate = async () => {
    if (newDisplayName === derivedUser.name || !newDisplayName.trim()) {
      setFeedback({ message: 'No changes or invalid name.', type: 'info' });
      setIsEditingProfile(false);
      return;
    }
    setIsUpdatingProfile(true);
    setFeedback({ message: '', type: 'info' });
    try {
      await updateProfile({ displayName: newDisplayName.trim() }, true);
      setFeedback({
        message: 'Profile updated successfully!',
        type: 'success',
      });
      setIsEditingProfile(false);
    } catch (error) {
      setFeedback({
        message: `Error updating profile: ${error.message}`,
        type: 'error',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      // Handle sign-out error if necessary, though signOut usually redirects
      console.error('Sign out error:', error);
      setFeedback({ message: 'Error signing out.', type: 'error' });
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setFeedback({ message: '', type: 'info' });
    try {
      await deleteProfile();
      // signOut is called within deleteProfile in the provider, leading to redirect
    } catch (error) {
      setFeedback({
        message: `Error deleting account: ${error.message}`,
        type: 'error',
      });
      setIsDeletingAccount(false);
    }
  };

  const isConfirmDeleteDisabled = confirmInput !== 'delete me';

  return (
    <div className="space-y-8 p-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <User className="mr-3 h-8 w-8 text-indigo-400" />
        User Settings
      </h1>

      <FeedbackAlert message={feedback.message} type={feedback.type} />

      {/* User Profile Card */}
      <Card className="bg-gray-800 border-gray-700 text-gray-100">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Avatar className="h-10 w-10 mr-4 border-2 border-gray-600">
              <AvatarImage src={derivedUser.image} alt={derivedUser.name} />
              <AvatarFallback>
                {derivedUser.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            Profile Details
          </CardTitle>
          <CardDescription className="text-gray-400">
            Manage your personal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 font-mono">
          <div>
            <Label htmlFor="displayName" className="text-gray-500">
              Name:
            </Label>
            {isEditingProfile ? (
              <Input
                id="displayName"
                ref={inputRef}
                className="mt-1 bg-gray-700 border-gray-600 text-lg"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                disabled={isUpdatingProfile}
              />
            ) : (
              <p className="text-lg">{derivedUser.name || 'N/A'}</p>
            )}
          </div>
          <div>
            <Label className="text-gray-500">Email:</Label>
            <p className="text-lg">{derivedUser.email || 'N/A'}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          {isEditingProfile ? (
            <>
              <Button
                variant="indigo-ghost"
                onClick={() => {
                  setIsEditingProfile(false);
                  setNewDisplayName(derivedUser.name); // Reset to current name
                }}
                disabled={isUpdatingProfile}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProfileUpdate}
                disabled={
                  isUpdatingProfile ||
                  newDisplayName === derivedUser.name ||
                  !newDisplayName.trim()
                }
              >
                {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button
              variant="indigo-outline"
              onClick={() => setIsEditingProfile(true)}
            >
              Edit Profile
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Sign Out Section */}
      <Card className="bg-gray-800 border-gray-700 text-gray-100">
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
            className="w-full sm:w-auto"
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

      {/* Danger Zone Card */}
      <Card className="bg-gray-800 border-red-900/60 text-gray-100">
        <CardHeader>
          <CardTitle className="text-xl flex items-center text-red-500">
            <AlertTriangle className="mr-3 h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription className="text-gray-400">
            Permanent and irreversible actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-red-700/50 rounded-lg bg-red-900/20">
            <h3 className="font-semibold text-red-400">Delete Your Account</h3>
            <p className="text-sm text-gray-300 mt-1">
              All your data will be permanently erased. This action cannot be
              undone.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <AlertDialog onOpenChange={(open) => !open && setConfirmInput('')}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeletingAccount}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-700 text-gray-100 font-mono">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl text-red-500 flex items-center">
                  <AlertTriangle className="mr-3 h-6 w-6" /> Confirm Account
                  Deletion
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 pt-4">
                  Are you absolutely sure? This action is irreversible. To
                  confirm, type &quot;
                  <strong className="text-green-400">delete me</strong>&quot;
                  below.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Label htmlFor="confirm-delete" className="text-gray-400">
                  Confirm Deletion:
                </Label>
                <Input
                  id="confirm-delete"
                  className="mt-2 bg-gray-800 border-gray-600 focus:border-green-500 focus:ring-green-500 text-green-400 placeholder:text-gray-600"
                  placeholder="Type 'delete me' here..."
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  autoFocus
                />
              </div>
              <AlertDialogFooter className="sm:justify-between">
                <AlertDialogCancel
                  variant="secondary"
                  onClick={() => setConfirmInput('')}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isConfirmDeleteDisabled || isDeletingAccount}
                  onClick={() => {
                    if (!isConfirmDeleteDisabled) handleDeleteAccount();
                  }}
                >
                  {isDeletingAccount ? 'Deleting...' : 'Yes, Delete It'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
