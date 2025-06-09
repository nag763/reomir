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
import {
  User,
  Trash2,
  AlertTriangle,
  LogOut,
  Github,
  LucideGithub,
  GithubIcon,
} from 'lucide-react'; // Added Github
import { useUserProfile } from '@/components/UserProfileProvider';
import { signOut, useSession } from 'next-auth/react';
import { callAuthenticatedApi } from '@/lib/apiClient'; // Added
// import { useRouter } from 'next/navigation'; // Potentially needed for query params

const FEEDBACK_TIMEOUT = 3000;

export default function SettingsPage() {
  const { data: session } = useSession();
  const { profile, updateProfile, deleteProfile, refetchProfile } =
    useUserProfile();

  const [confirmInput, setConfirmInput] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: 'info' });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // GitHub specific state
  const [isGitHubConnecting, setIsGitHubConnecting] = useState(false);
  const [isGitHubDisconnecting, setIsGitHubDisconnecting] = useState(false);
  const [githubError, setGithubError] = useState('');
  // const router = useRouter(); // If needed for query params

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

  // Effect to handle GitHub callback query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const githubConnected = searchParams.get('github_connected');
    const githubErrorParam = searchParams.get('github_error');

    if (githubConnected === 'true') {
      setFeedback({
        message: 'GitHub connected successfully!',
        type: 'success',
      });
      refetchProfile();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (githubErrorParam) {
      let errorMessage = 'An unknown error occurred with GitHub integration.';
      switch (githubErrorParam) {
        case 'missing_params':
          errorMessage = 'GitHub connection failed: Missing parameters.';
          break;
        case 'config_error':
          errorMessage =
            'GitHub connection failed: Server configuration error.';
          break;
        case 'token_exchange_failed':
          errorMessage =
            'GitHub connection failed: Could not get access token.';
          break;
        case 'user_fetch_failed':
          errorMessage =
            'GitHub connection failed: Could not fetch user details.';
          break;
        case 'api_error':
          errorMessage = 'GitHub connection failed: API communication error.';
          break;
        case 'internal_error':
          errorMessage = 'GitHub connection failed: Internal server error.';
          break;
      }
      setGithubError(errorMessage); // Display in the GitHub card
      setFeedback({ message: errorMessage, type: 'error' }); // Also show in global feedback
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refetchProfile]); // Added profile.refetchProfile to dependency array

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

  const handleGitHubConnect = async () => {
    setIsGitHubConnecting(true);
    setGithubError('');
    setFeedback({ message: '', type: 'info' }); // Clear global feedback

    try {
      const connectUrl = `github/connect`; // Relative URL, browser handles the host
      let data = await callAuthenticatedApi(connectUrl, { method: 'GET' });

      // Check if the redirectUrl exists in the response
      if (data && data.redirectUrl) {
        console.log('Redirect URL received:', data.redirectUrl);

        // Open the URL in a new window/tab
        const popup = window.open(
          data.redirectUrl,
          '_blank',
          'width=600,height=800,noopener,noreferrer,popup=true,left=' +
            (window.screen.width / 2 - 300) +
            ',top=' +
            (window.screen.height / 2 - 400),
        );
        // 1. Listen for a success message from the popup
        const handleMessage = (event) => {
          // IMPORTANT: Validate the origin of the message for security
          // It should come from the same origin as your main app, as the callback now sends the message
          if (event.origin !== window.location.origin) {
            console.warn(`Message from unexpected origin: ${event.origin}`);
            return;
          }

          if (
            event.data?.source === 'github-popup' &&
            event.data?.status === 'success'
          ) {
            console.log('GitHub connection successful! Refetching profile.');
            setFeedback({
              message: 'GitHub connected successfully!',
              type: 'success',
            });
            refetchProfile();

            // Clean up everything
            window.removeEventListener('message', handleMessage);
            clearInterval(popupPoller);
            setIsGitHubConnecting(false);
          }
        };

        window.addEventListener('message', handleMessage);

        // 2. Fallback: Poll to see if the user manually closed the popup
        const popupPoller = setInterval(() => {
          if (popup && popup.closed) {
            console.log(
              'Popup closed by user or flow ended. Refetching profile.',
            );
            // We refetch as a safety measure. If the postMessage worked, this is redundant but harmless.
            // If the user closed the popup manually, this is essential.
            refetchProfile();

            // Clean up everything
            clearInterval(popupPoller);
            window.removeEventListener('message', handleMessage);
            setIsGitHubConnecting(false);
          }
        }, 500);
      } else {
        const errMsg = 'No redirect URL provided in the response.';
        setGithubError(errMsg);
        setFeedback({ message: errMsg, type: 'error' });
        setIsGitHubConnecting(false);
      }

      // No need to set isGitHubConnecting to false here, as the page will navigate away.
    } catch (error) {
      console.error('GitHub Connect Error:', error);
      const errMsg =
        error.response?.data?.error ||
        error.message ||
        'Failed to initiate GitHub connection.';
      setGithubError(errMsg);
      setFeedback({ message: errMsg, type: 'error' });
      setIsGitHubConnecting(false);
    }
  };

  const handleGitHubDisconnect = async () => {
    setIsGitHubDisconnecting(true);
    setGithubError('');
    setFeedback({ message: '', type: 'info' });

    try {
      await callAuthenticatedApi('github/disconnect', { method: 'DELETE' });
      setFeedback({
        message: 'GitHub disconnected successfully!',
        type: 'success',
      });
      refetchProfile();
    } catch (error) {
      console.error('GitHub Disconnect Error:', error);
      const errMsg =
        error.response?.data?.error ||
        error.message ||
        'Failed to disconnect GitHub.';
      setGithubError(errMsg);
      setFeedback({ message: errMsg, type: 'error' });
    } finally {
      setIsGitHubDisconnecting(false);
    }
  };

  const isConfirmDeleteDisabled = confirmInput !== 'delete me';

  return (
    <div className="space-y-8 p-8">
      <h1 className="mb-6 flex items-center text-3xl font-bold">
        <User className="mr-3 h-8 w-8 text-indigo-400" />
        User Settings
      </h1>

      <FeedbackAlert message={feedback.message} type={feedback.type} />

      {/* User Profile Card */}
      <Card className="border-gray-700 bg-gray-800 text-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Avatar className="mr-4 h-10 w-10 border-2 border-gray-600">
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
                className="mt-1 border-gray-600 bg-gray-700 text-lg"
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

      {/* GitHub Integration Card */}
      <Card className="border-gray-700 bg-gray-800 text-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Github className="mr-3 h-6 w-6 text-purple-400" /> GitHub
            Integration
          </CardTitle>
          <CardDescription className="text-gray-400">
            Connect your GitHub account to link repositories and activities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.isLoadingProfile ? (
            <p>Loading GitHub status...</p>
          ) : profile.github_connected ? (
            <div>
              <p className="text-green-400">
                Successfully connected as:{' '}
                <strong className="font-semibold">
                  {profile.github_login || 'GitHub User'}
                </strong>
              </p>
              {/* Optionally display GitHub ID or other info if available and needed */}
              {/* <p className="text-xs text-gray-500">ID: {profile.github_id}</p> */}
            </div>
          ) : (
            <p>You are not connected to GitHub.</p>
          )}
          {githubError && <p className="text-sm text-red-500">{githubError}</p>}
        </CardContent>
        <CardFooter className="flex justify-end">
          {profile.github_connected ? (
            <Button
              variant="destructiveOutline"
              onClick={handleGitHubDisconnect}
              disabled={isGitHubDisconnecting || profile.isLoadingProfile}
            >
              <GithubIcon />
              {isGitHubDisconnecting ? 'Disconnecting...' : 'Disconnect GitHub'}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleGitHubConnect}
              disabled={isGitHubConnecting || profile.isLoadingProfile}
            >
              <GithubIcon />
              {isGitHubConnecting ? 'Connecting...' : 'Connect to GitHub'}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Sign Out Section */}
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
      <Card className="border-red-900/60 bg-gray-800 text-gray-100">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-red-500">
            <AlertTriangle className="mr-3 h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription className="text-gray-400">
            Permanent and irreversible actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-red-700/50 bg-red-900/20 p-4">
            <h3 className="font-semibold text-red-400">Delete Your Account</h3>
            <p className="mt-1 text-sm text-gray-300">
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
            <AlertDialogContent className="border-gray-700 bg-gray-900 font-mono text-gray-100">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center text-2xl text-red-500">
                  <AlertTriangle className="mr-3 h-6 w-6" /> Confirm Account
                  Deletion
                </AlertDialogTitle>
                <AlertDialogDescription className="pt-4 text-gray-400">
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
                  className="mt-2 border-gray-600 bg-gray-800 text-green-400 placeholder:text-gray-600 focus:border-green-500 focus:ring-green-500"
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
