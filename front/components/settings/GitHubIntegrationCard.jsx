// front/components/settings/GitHubIntegrationCard.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Github, GithubIcon } from 'lucide-react'; // Assuming GithubIcon is preferred or similar
import { useGitHubIntegration } from '@/hooks/useGitHubIntegration';

export const GitHubIntegrationCard = ({
  profile,
  isLoadingProfile,
  refetchProfile,
  showFeedback,
}) => {
  const {
    isConnecting,
    isDisconnecting,
    error: hookError, // Rename to avoid conflict if 'error' prop was ever passed
    handleConnect,
    handleDisconnect,
  } = useGitHubIntegration(refetchProfile, showFeedback);

  // Ensure profile and its properties are accessed safely
  const isGitHubConnected = profile?.github_connected ?? false;
  const githubLogin = profile?.github_login || 'GitHub User';

  return (
    <Card className="border-gray-700 bg-gray-800 text-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Github className="mr-3 h-6 w-6 text-purple-400" /> GitHub Integration
        </CardTitle>
        <CardDescription className="text-gray-400">
          Connect your GitHub account to link repositories and activities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoadingProfile ? (
          <p>Loading GitHub status...</p>
        ) : isGitHubConnected ? (
          <div>
            <p className="text-green-400">
              Successfully connected as:{' '}
              <strong className="font-semibold">{githubLogin}</strong>
            </p>
          </div>
        ) : (
          <p>You are not connected to GitHub.</p>
        )}
        {hookError && <p className="text-sm text-red-500">{hookError}</p>}
      </CardContent>
      <CardFooter className="flex justify-end">
        {isGitHubConnected ? (
          <Button
            variant="destructiveOutline"
            onClick={handleDisconnect}
            disabled={isDisconnecting || isLoadingProfile}
          >
            <GithubIcon className="mr-2 h-4 w-4" /> {/* Added icon to button */}
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect GitHub'}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleConnect}
            disabled={isConnecting || isLoadingProfile}
          >
            <GithubIcon className="mr-2 h-4 w-4" /> {/* Added icon to button */}
            {isConnecting ? 'Connecting...' : 'Connect to GitHub'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
