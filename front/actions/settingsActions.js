// front/actions/settingsActions.js
import { callAuthenticatedApi } from '@/lib/apiClient';

/**
 * Initiates the GitHub connection process.
 * Calls the backend to get a redirect URL for GitHub OAuth.
 * @returns {Promise<string>} A promise that resolves with the redirect URL.
 * @throws {Error} If the API call fails or the response is invalid.
 */
export const connectGitHub = async () => {
  const response = await callAuthenticatedApi('github/connect', {
    method: 'GET',
  });

  if (!response || !response.redirectUrl) {
    console.error(
      'Failed to connect GitHub or redirect URL missing in response:',
      response,
    );
    throw new Error(
      'Failed to connect GitHub or redirect URL missing in response.',
    );
  }
  return response.redirectUrl;
};

/**
 * Disconnects the currently linked GitHub account.
 * Calls the backend to remove the GitHub association.
 * @returns {Promise<object>} A promise that resolves with the success response from the API.
 * @throws {Error} If the API call fails.
 */
export const disconnectGitHub = async () => {
  const response = await callAuthenticatedApi('github/disconnect', {
    method: 'DELETE',
  });

  // Assuming a successful DELETE request might return a 200/204 with a success message or just status.
  // If the API throws an error for non-ok status, callAuthenticatedApi will handle it.
  // If it returns an error structure for a failed disconnect operation (e.g. user not connected),
  // that should be handled here or rely on callAuthenticatedApi's error.
  // For now, assume callAuthenticatedApi throws for non-2xx and successful response is the parsed JSON.
  return response;
};
