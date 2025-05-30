// components/UserProfileProvider.jsx
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useSession } from 'next-auth/react';
import { callAuthenticatedApi } from '@/lib/apiClient'; // Your API client from previous step
import LoadingScreen from './LoadingScreen'; // Your global loading screen
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'next-auth/react';

// Define the shape of your context
const UserProfileContext = createContext({
  session: null, // The next-auth session object
  profile: null, // Custom application data for the user
  isLoadingProfile: true, // Specific loading state for the profile
  profileError: null,
  updateProfile: async () => {}, // Function to update profile
  deleteProfile: async () => {}, // Function to delete profile
  refetchProfile: async () => {}, // Function to manually refetch profile
});

export const UserProfileProvider = ({ children }) => {
  const { data: session, status: sessionStatus } = useSession();
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false); // For updating
  const [profileError, setProfileError] = useState(null);
  const { toast } = useToast(); // Initialize toast

  const fetchUserProfile = useCallback(async () => {
    // Only fetch if session is authenticated and we have an idToken
    if (sessionStatus === 'authenticated' && session?.idToken) {
      setIsLoadingProfile(true);
      setProfileError(null);
      try {
        console.log('Fetching user profile from /api/v1/users/self...');
        const data = await callAuthenticatedApi('users/self', {
          method: 'GET',
        });
        setProfile(data);
        console.log('User profile data fetched:', data);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        setProfileError(error.message || 'Failed to load profile');
        setProfile(null); // Clear profile on error
      } finally {
        setIsLoadingProfile(false);
      }
    } else if (sessionStatus === 'unauthenticated') {
      setProfile(null); // Clear profile if user logs out
      setProfileError(null);
      setIsLoadingProfile(false);
    } else if (sessionStatus === 'loading') {
      setIsLoadingProfile(true); // Profile is loading if session is loading
    }
  }, [sessionStatus, session?.idToken]); // Depend on sessionStatus and token availability

  const updateProfile = useCallback(
    async (payload, partial = false) => {
      if (sessionStatus !== 'authenticated' || !session?.idToken) {
        toast({
          title: 'Authentication Error',
          description: 'You must be signed in to update your profile.',
          variant: 'destructive',
        });
        throw new Error('User not authenticated.'); // Or return null/false
      }
      setIsUpdatingProfile(true); // Set specific loading state for update
      setProfileError(null); // Clear previous errors
      try {
        console.log('Updating user profile with payload:', payload);
        // Your existing API call logic
        const data = await callAuthenticatedApi('users/self', {
          method: partial ? 'PUT' : 'POST', // Or always PUT if your backend expects it
          body: JSON.stringify(payload), // callAuthenticatedApi already stringifies
        });

        toast({
          title: 'Profile Updated!',
          description: 'Your profile information has been saved.',
          variant: 'default', // Or use a "success" variant if you have one
        });

        setProfile({ ...profile, ...data });

        console.log('User profile updated and refetched:', data);
        return data;
      } catch (error) {
        console.error('Failed to update user profile:', error);
        const errorMessage =
          error.message || 'Failed to update profile. Please try again.';
        setProfileError(errorMessage); // Set general profile error if needed
        toast({
          title: 'Update Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        throw error; // Re-throw the error so calling components can handle it if they want
      } finally {
        setIsUpdatingProfile(false); // Reset specific loading state for update
      }
    },
    [sessionStatus, session?.idToken, profile, toast], // Added toast to dependencies
  );

  const deleteProfile = useCallback(async () => {
    if (sessionStatus !== 'authenticated' || !session?.idToken) {
      console.warn('Cannot delete profile: User not authenticated.');
      return; // Or throw an error
    }
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      console.log('Deleting user profile...');
      await callAuthenticatedApi('users/self', {
        method: 'DELETE',
      });
      console.log('User profile deleted.');
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Failed to delete user profile:', error);
      setProfileError(error.message || 'Failed to delete profile');
      throw error; // Re-throw the error
    } finally {
      setIsLoadingProfile(false);
    }
  }, [sessionStatus, session?.idToken]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]); // Call fetchUserProfile when it changes (i.e., when dependencies change)

  // Overall loading state considers both session and profile loading
  const isLoadingGlobally = sessionStatus === 'loading' || isLoadingProfile;

  const contextValue = {
    session,
    profile,
    isLoadingProfile: isLoadingGlobally, // Use combined loading state
    profileError,
    updateProfile,
    deleteProfile,
    refetchProfile: fetchUserProfile, // Expose refetch function
  };

  // If session is loading, or if profile is loading after session is authenticated, show loader
  if (isLoadingGlobally && sessionStatus !== 'unauthenticated') {
    return <LoadingScreen />;
  }

  return (
    <UserProfileContext.Provider value={contextValue}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => useContext(UserProfileContext);
