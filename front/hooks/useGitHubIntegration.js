// front/hooks/useGitHubIntegration.js
import { useState, useEffect, useCallback } from 'react';
import { connectGitHub, disconnectGitHub } from '@/actions/settingsActions';

export const useGitHubIntegration = (refetchProfile, showFeedback) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState('');

  // Effect to handle GitHub callback query parameters from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const githubConnectedParam = searchParams.get('github_connected');
    const githubErrorParam = searchParams.get('github_error');

    if (githubConnectedParam === 'true') {
      showFeedback('GitHub connected successfully!', 'success');
      refetchProfile();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (githubErrorParam) {
      let errorMessage = 'An unknown error occurred with GitHub integration.';
      // Simple mapping, can be expanded based on specific error codes from backend
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
        default:
          errorMessage = `GitHub connection failed: ${githubErrorParam.replace(/_/g, ' ')}.`;
          break;
      }
      setError(errorMessage);
      showFeedback(errorMessage, 'error');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refetchProfile, showFeedback]); // Runs on mount and if dependencies change

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setError('');

    try {
      const redirectUrl = await connectGitHub();
      if (redirectUrl) {
        const popup = window.open(
          redirectUrl,
          '_blank',
          'width=600,height=800,noopener,noreferrer,popup=true,left=' +
            (window.screen.width / 2 - 300) +
            ',top=' +
            (window.screen.height / 2 - 400),
        );

        let popupPoller; // Declare here to be accessible in handleMessage cleanup

        const handleMessage = (event) => {
          if (event.origin !== window.location.origin) {
            console.warn(`Message from unexpected origin: ${event.origin}`);
            return;
          }
          if (
            event.data?.source === 'github-popup' &&
            event.data?.status === 'success'
          ) {
            showFeedback('GitHub connected successfully!', 'success');
            refetchProfile();
            setIsConnecting(false);
            setError('');
            window.removeEventListener('message', handleMessage);
            if (popupPoller) clearInterval(popupPoller);
            if (popup && !popup.closed) popup.close();
          }
        };

        window.addEventListener('message', handleMessage);

        popupPoller = setInterval(() => {
          if (popup && popup.closed) {
            // Fallback if postMessage didn't work or user closed manually
            // We assume a refetch is needed to check status
            refetchProfile();
            setIsConnecting(false); // Stop loading state
            // We don't show generic success here as we don't know for sure if it was successful.
            // The URL param handler or next profile state will confirm.
            clearInterval(popupPoller);
            window.removeEventListener('message', handleMessage);
          } else if (!popup) {
            // If popup failed to open
            clearInterval(popupPoller);
            window.removeEventListener('message', handleMessage);
            setError('Popup window was blocked or failed to open.');
            showFeedback(
              'Popup window was blocked or failed to open. Please disable your popup blocker for this site and try again.',
              'error',
            );
            setIsConnecting(false);
          }
        }, 500);
      } else {
        // Should be caught by connectGitHub action, but as a safeguard:
        throw new Error('No redirect URL provided.');
      }
    } catch (err) {
      const errMsg = err.message || 'Failed to initiate GitHub connection.';
      setError(errMsg);
      showFeedback(errMsg, 'error');
      setIsConnecting(false);
    }
  }, [showFeedback, refetchProfile]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);
    setError('');
    try {
      await disconnectGitHub();
      showFeedback('GitHub disconnected successfully!', 'success');
      refetchProfile();
    } catch (err) {
      const errMsg = err.message || 'Failed to disconnect GitHub.';
      setError(errMsg);
      showFeedback(errMsg, 'error');
    } finally {
      setIsDisconnecting(false);
    }
  }, [showFeedback, refetchProfile]);

  return {
    isConnecting,
    isDisconnecting,
    error,
    handleConnect,
    handleDisconnect,
  };
};
