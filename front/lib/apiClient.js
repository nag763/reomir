'use client';

import { getSession } from 'next-auth/react'; // Can be used outside components

export async function callAuthenticatedApi(
  endpoint,
  options = {},
  version = 'v1',
  retried = false, // Keep track of retries
) {
  const API_GATEWAY_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
  let session = await getSession();

  if (!session || !session.idToken) {
    console.error('User not authenticated or ID token not available.');
    throw new Error('Authentication required.');
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${session.idToken}`,
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers,
  };

  if (!API_GATEWAY_BASE_URL) {
    throw new Error(
      'API Gateway URL is not configured. Check NEXT_PUBLIC_API_GATEWAY_URL.',
    );
  }

  const response = await fetch(
    `${API_GATEWAY_BASE_URL}/api/${version}/${endpoint}`,
    config,
  );

  if (!response.ok) {
    if (response.status === 401 && !retried) {
      console.log('Received 401, attempting to refresh token...');
      // Force session update which should trigger token refresh via NextAuth JWT callback
      session = await getSession({ force: true });

      if (session && session.idToken && !session.error) {
        console.log('Token refreshed successfully, retrying API call.');
        // Retry the call with the new token, mark as retried
        return callAuthenticatedApi(endpoint, options, version, true);
      } else {
        console.error(
          'Failed to refresh token or session error occurred:',
          session?.error,
        );
        // If refresh failed, throw an error or handle as appropriate
        const error = new Error(
          session?.error || 'Failed to refresh token and authenticate.',
        );
        // @ts-ignore
        error.response = response;
        throw error;
      }
    }

    // For non-401 errors or if retried already, handle as before
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = {
        message: response.statusText || 'An unknown error occurred',
      };
    }
    console.error('API Error:', response.status, errorData);
    const error = new Error(
      errorData.message || `Request failed with status ${response.status}`,
    );
    // @ts-ignore
    error.response = response; // Attach full response to error object
    // @ts-ignore
    error.data = errorData;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
