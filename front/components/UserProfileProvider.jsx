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

// Define the shape of your context
const UserProfileContext = createContext({
  session: null, // The next-auth session object
  profile: null, // Custom application data for the user
  isLoadingProfile: true, // Specific loading state for the profile
  profileError: null,
  updateProfile: async () => {}, // Function to update profile
  refetchProfile: async () => {}, // Function to manually refetch profile
});

export const UserProfileProvider = ({ children }) => {
  const { data: session, status: sessionStatus } = useSession();
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);

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
    async (payload) => {
      try {
        console.log('Updating user profile with payload:', payload);
        const data = await callAuthenticatedApi('users/self', {
          method: 'POST', // Assuming POST is used for updates
          body: JSON.stringify(payload),
        });
        fetchUserProfile();
        console.log('User profile updated:', data);
        return data;
      } catch (error) {
        console.error('Failed to update user profile:', error);
        setProfileError(error.message || 'Failed to update profile');
        throw error; // Re-throw the error so calling components can handle it
      }
    },
    [sessionStatus, session?.idToken, fetchUserProfile],
  ); // Depend on sessionStatus and token availability

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
