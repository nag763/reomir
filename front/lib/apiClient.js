'use client';

import { getSession } from 'next-auth/react'; // Can be used outside components

const API_GATEWAY_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

/**
 * Calls an authenticated API endpoint through the API Gateway.
 * It automatically retrieves the session ID token and adds it to the Authorization header.
 *
 * @async
 * @param {string} endpoint - The specific API endpoint path (e.g., 'chat', 'documents').
 * @param {RequestInit} [options={}] - Standard `fetch` options (method, body, custom headers, etc.).
 *                                   The body will be JSON.stringified if provided.
 * @param {string} [version='v1'] - The API version string (e.g., 'v1', 'v2').
 * @returns {Promise<any>} A promise that resolves with the JSON response from the API.
 *                         Returns `null` for 204 No Content responses.
 * @throws {Error} If authentication fails (no session or ID token), if the API Gateway URL is not configured,
 *                 or if the API returns a non-OK status. The error object will contain `response` and `data` properties
 *                 from the server if available.
 */
export async function callAuthenticatedApi(
  endpoint,
  options = {},
  version = 'v1',
) {
  const session = await getSession();

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

  // Handle responses that might not have a body (e.g., 204 No Content)
  if (response.status === 204) {
    return null;
  }

  return response.json(); // Assumes API always returns JSON
}
