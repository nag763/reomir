'use client';

import { getSession } from 'next-auth/react'; // Can be used outside components

const API_GATEWAY_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

export async function callAuthenticatedApi(
  endpoint,
  options = {},
  version = 'v1',
) {
  const session = await getSession();

  if (!session || !session.idToken) {
    // Handle cases where the user is not authenticated or token is missing
    // You might throw an error, or redirect, or return a specific status
    console.error('User not authenticated or ID token not available.');
    throw new Error('Authentication required.');
  }

  const headers = {
    ...options.headers, // Allow custom headers
    Authorization: `Bearer ${session.idToken}`,
    'Content-Type': 'application/json', // Default, can be overridden
  };

  const config = {
    ...options, // Spread other options like method, body
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
