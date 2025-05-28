'use client';

import React, { useEffect, useState } from 'react';
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
import { User, Trash2, AlertTriangle, LogOut } from 'lucide-react'; // Added LogOut
import { useRouter } from 'next/navigation';

import { signOut, useSession } from 'next-auth/react';

export default function SettingsPage() {
  const [confirmInput, setConfirmInput] = useState('');
  const isConfirmDisabled = confirmInput !== 'delete me';

  const router = useRouter();
  const { data: session, status } = useSession();

  // States for profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // State for feedback messages (e.g., success/error)
  const [feedback, setFeedback] = useState({ message: '', type: '' }); // type: 'success' or 'error'

  // State for account deletion
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // State for sign out
  const [isSigningOut, setIsSigningOut] = useState(false);

  const user = {
    name: session.user?.name || 'User',
    email: session.user?.email || '',
    image: session.user?.image || null,
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setFeedback({ message: '', type: '' });
    try {
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
        router.push('/'); // Redirect to home/login after deletion
      }
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        setFeedback({
          message:
            'This action requires a recent login. Please sign out and sign back in to delete your account.',
          type: 'error',
        });
      } else {
        setFeedback({
          message: `Error deleting account: ${error.message}`,
          type: 'error',
        });
      }
      setConfirmInput(''); // Clear input on error
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user || newDisplayName === user.displayName) {
      setIsEditingProfile(false);
      setFeedback({ message: 'No changes to save.', type: 'info' });
      setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
      return;
    }
    setIsUpdatingProfile(true);
    setFeedback({ message: '', type: '' });
    try {
      await updateProfile(auth.currentUser, { displayName: newDisplayName });
      setFeedback({
        message: 'Profile updated successfully!',
        type: 'success',
      });
      setIsEditingProfile(false);
      // user object from useAuth will update via onAuthStateChanged
    } catch (error) {
      setFeedback({
        message: `Error updating profile: ${error.message}`,
        type: 'error',
      });
    } finally {
      setIsUpdatingProfile(false);
      setTimeout(() => setFeedback({ message: '', type: '' }), 5000);
    }
  };

  const handleSignOut = async () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="space-y-8 p-4 md:p-0">
      <title>Settings</title>
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <User className="mr-3 h-8 w-8 text-indigo-400" />
        User Settings
      </h1>

      {/* Feedback Message Display */}
      {feedback.message && (
        <div
          className={`p-4 mb-4 rounded-md text-sm ${
            feedback.type === 'error'
              ? 'bg-red-900/30 text-red-300 border border-red-700'
              : feedback.type === 'success'
                ? 'bg-green-900/30 text-green-300 border border-green-700'
                : 'bg-blue-900/30 text-blue-300 border border-blue-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* User Profile Card */}
      <Card className="bg-gray-800 border-gray-700 text-gray-100">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Avatar className="h-10 w-10 mr-4 border-2 border-gray-600">
              <AvatarImage src={user?.image} />
              <AvatarFallback>
                {user?.displayName?.charAt(0) || 'U'}
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
            <Label className="text-gray-500">Name:</Label>
            {isEditingProfile ? (
              <Input
                className="mt-1 bg-gray-700 border-gray-600 text-lg"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                disabled={isUpdatingProfile}
              />
            ) : (
              <p className="text-lg">{user?.name || 'N/A'}</p>
            )}
          </div>
          <div>
            <Label className="text-gray-500">Email:</Label>
            <p className="text-lg">{user?.email || 'N/A'}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          {isEditingProfile ? (
            <>
              <Button
                variant="indigo-ghost"
                onClick={() => {
                  setIsEditingProfile(false);
                  setNewDisplayName(user?.displayName || '');
                }}
                disabled={isUpdatingProfile}
              >
                Cancel
              </Button>
              {/* Default variant will be used here, which is our indigo primary button */}
              <Button
                onClick={handleProfileUpdate}
                disabled={
                  isUpdatingProfile || newDisplayName === user?.displayName
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
            End your current session and return to the homepage.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end">
          <Button
            variant="outline" // Uses the gray outline variant
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full sm:w-auto" // Responsive width
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
            Be careful! Actions in this zone are permanent and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-red-700/50 rounded-lg bg-red-900/20">
            <h3 className="font-semibold text-red-400">Delete Your Account</h3>
            <p className="text-sm text-gray-300 mt-1">
              Once you delete your account, all your data, integrations, and
              configurations will be permanently erased. There is no going back.
              Please be certain.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeletingAccount}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-700 text-gray-100 font-mono">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl text-red-500 flex items-center">
                  <AlertTriangle className="mr-3 h-6 w-6" />
                  Account Self-Destruct Sequence Initiated!
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 pt-4">
                  Woah there, code-slinger! Are you *absolutely* sure you want
                  to yeet your account into the digital void? All your precious
                  settings will be gone, like tears in rain... or that one
                  semicolon you spent hours looking for.
                  <br />
                  <br />
                  This action is{' '}
                  <strong className="text-red-400">IRREVERSIBLE</strong>. To
                  prove you&apos;re not just rage-quitting after a merge
                  conflict, type &quot;
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
                  variant="secondary" // Uses the new secondary variant
                  onClick={() => setConfirmInput('')} // Clear input on cancel
                >
                  Phew, Cancel!
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive" // Uses the destructive variant
                  disabled={isConfirmDisabled || isDeletingAccount}
                  onClick={() => {
                    if (!isConfirmDisabled) {
                      handleDeleteAccount();
                      // confirmInput will be cleared on error by handleDeleteAccount
                    }
                  }}
                >
                  {isDeletingAccount ? 'Deleting...' : 'Yes, Obliterate It!'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
