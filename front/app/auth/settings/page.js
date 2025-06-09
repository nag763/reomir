// settings/page.js
'use client';

import React, { useEffect } from 'react'; // Removed useRef, useState
import { User } from 'lucide-react';
import { useUserProfile } from '@/components/UserProfileProvider';
import { useSession } from 'next-auth/react';
import { FeedbackAlert } from '@/components/FeedbackAlert';
import { useFeedback } from '@/hooks/useFeedback';
import { ProfileDetailsCard } from '@/components/settings/ProfileDetailsCard';
import { GitHubIntegrationCard } from '@/components/settings/GitHubIntegrationCard';
import { SignOutCard } from '@/components/settings/SignOutCard';
import { DangerZoneCard } from '@/components/settings/DangerZoneCard';

// const FEEDBACK_TIMEOUT = 3000; // Now handled by useFeedback hook

export default function SettingsPage() {
  const { data: session } = useSession();
  const {
    profile,
    isLoadingProfile,
    updateProfile,
    deleteProfile,
    refetchProfile,
  } = useUserProfile();
  const { feedback, showFeedback } = useFeedback(); // Default timeout is 3000ms

  // const inputRef = useRef(null); // Moved to ProfileDetailsCard

  const derivedUser = {
    name: profile?.displayName || session?.user?.name || 'User',
    email: session?.user?.email || '',
    image: session?.user?.image || null,
  };

  useEffect(() => {
    document.title = 'Settings';
  }, []);

  // Removed useEffect for newDisplayName initialization (moved to ProfileDetailsCard)
  // Removed useEffect for inputRef focus (moved to ProfileDetailsCard)
  // Removed useEffect for feedback timeout (moved to useFeedback hook)
  // Removed useEffect for GitHub callback query parameters (moved to useGitHubIntegration hook, which is used by GitHubIntegrationCard)

  return (
    <div className="space-y-8 p-8">
      <h1 className="mb-6 flex items-center text-3xl font-bold">
        <User className="mr-3 h-8 w-8 text-indigo-400" />
        User Settings
      </h1>

      <FeedbackAlert message={feedback.message} type={feedback.type} />

      <ProfileDetailsCard
        user={derivedUser}
        profile={profile}
        updateProfile={updateProfile}
        showFeedback={showFeedback}
      />

      <GitHubIntegrationCard
        profile={profile}
        isLoadingProfile={isLoadingProfile}
        refetchProfile={refetchProfile}
        showFeedback={showFeedback}
      />

      <SignOutCard showFeedback={showFeedback} />

      <DangerZoneCard
        deleteProfile={deleteProfile}
        showFeedback={showFeedback}
      />
    </div>
  );
}
