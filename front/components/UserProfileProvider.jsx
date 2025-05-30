// components/UserProfileProvider.js
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useSession, signOut } from 'next-auth/react';
import { callAuthenticatedApi } from '@/lib/apiClient';
import LoadingScreen from './LoadingScreen';
import { useToast } from '@/hooks/use-toast';

const UserProfileContext = createContext({
  session: null,
  profile: null,
  isLoadingProfile: true,
  profileError: null,
  updateProfile: async () => {},
  deleteProfile: async () => {},
  refetchProfile: async () => {},
});

export const UserProfileProvider = ({ children }) => {
  const { data: session, status: sessionStatus } = useSession();
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUpdatingInternal, setIsUpdatingInternal] = useState(false); // Internal state for update operation
  const [profileError, setProfileError] = useState(null);
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async () => {
    if (sessionStatus === 'authenticated' && session?.idToken) {
      setIsLoadingProfile(true);
      setProfileError(null);
      try {
        const data = await callAuthenticatedApi('users/self', {
          method: 'GET',
        });
        setProfile(data);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        setProfileError(error.message || 'Failed to load profile');
        setProfile(null);
      } finally {
        setIsLoadingProfile(false);
      }
    } else if (sessionStatus === 'unauthenticated') {
      setProfile(null);
      setProfileError(null);
      setIsLoadingProfile(false);
    } else if (sessionStatus === 'loading') {
      setIsLoadingProfile(true);
    }
  }, [sessionStatus, session?.idToken]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const updateProfile = useCallback(
    async (payload, partial = false) => {
      // Defaulting partial to true as PUT is common for updates
      if (sessionStatus !== 'authenticated' || !session?.idToken) {
        toast({
          title: 'Authentication Error',
          description: 'You must be signed in to update your profile.',
          variant: 'destructive',
        });
        throw new Error('User not authenticated.');
      }
      if (isUpdatingInternal) {
        toast({
          title: 'Update in Progress',
          description: 'An update is already in progress. Please wait.',
          variant: 'default',
        });
        throw new Error('Update already in progress.');
      }

      setIsUpdatingInternal(true);
      setProfileError(null);
      try {
        const data = await callAuthenticatedApi('users/self', {
          method: partial ? 'PUT' : 'POST', // Ensure this matches your API (PUT for partial, POST for create/replace)
          body: payload, // callAuthenticatedApi likely handles JSON.stringify if needed
        });

        setProfile((prevProfile) => ({ ...prevProfile, ...data }));
        toast({
          title: 'Profile Updated',
          description: 'Your profile information has been saved.',
          variant: 'default', // Or 'success'
        });
        return data;
      } catch (error) {
        console.error('Failed to update user profile:', error);
        const errorMessage =
          error.message || 'Failed to update profile. Please try again.';
        setProfileError(errorMessage);
        toast({
          title: 'Update Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        throw error;
      } finally {
        setIsUpdatingInternal(false);
      }
    },
    [sessionStatus, session?.idToken, toast, isUpdatingInternal],
  );

  const deleteProfile = useCallback(async () => {
    if (sessionStatus !== 'authenticated' || !session?.idToken) {
      toast({
        title: 'Authentication Error',
        description: 'You must be signed in to delete your profile.',
        variant: 'destructive',
      });
      throw new Error('User not authenticated.');
    }
    setIsLoadingProfile(true); // Use general loading as it will lead to sign out
    setProfileError(null);
    try {
      await callAuthenticatedApi('users/self', { method: 'DELETE' });
      toast({
        title: 'Account Deleted',
        description: 'Your account has been successfully deleted.',
        variant: 'default',
      });
      await signOut({ callbackUrl: '/' }); // Redirect after successful deletion
    } catch (error) {
      console.error('Failed to delete user profile:', error);
      const errorMessage =
        error.message || 'Failed to delete profile. Please try again.';
      setProfileError(errorMessage);
      toast({
        title: 'Deletion Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoadingProfile(false); // Reset loading if deletion failed before signout
      throw error;
    }
    // No finally setIsLoadingProfile(false) here, as signOut should navigate away.
  }, [sessionStatus, session?.idToken, toast]);

  const isLoadingGlobally =
    sessionStatus === 'loading' ||
    (sessionStatus === 'authenticated' && isLoadingProfile);

  const contextValue = {
    session,
    profile,
    isLoadingProfile: isLoadingGlobally,
    profileError,
    updateProfile,
    deleteProfile,
    refetchProfile: fetchUserProfile,
  };

  if (isLoadingGlobally && sessionStatus !== 'unauthenticated') {
    return <LoadingScreen />;
  }

  return (
    <UserProfileContext.Provider value={contextValue}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
