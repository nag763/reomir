// lib/chatApiService.js
import { callAuthenticatedApi } from '@/lib/apiClient'; // Assuming apiClient handles auth
import { marked } from 'marked';

/**
 * Acquires a new chat session from the backend.
 * @param {string} determinedUserId - The ID of the user.
 * @param {string} appName - The name of the application.
 * @returns {Promise<string>} A promise that resolves with the session ID.
 * @throws {Error} If the session acquisition fails or the response is invalid.
 */
export const acquireChatSession = async (determinedUserId, appName) => {
  console.log(
    'Attempting to acquire session via API for user:',
    determinedUserId,
    'app:',
    appName,
  );
  // The backend might infer userId from the auth token, or you might need to send it.
  // If your API expects a body for session creation, include it here.
  // For example:
  // const body = { userId: determinedUserId, appName: appName };
  const response = await callAuthenticatedApi('agent/session', {
    method: 'POST',
    // body: JSON.stringify(body), // If your API expects a body
    // headers: { 'Content-Type': 'application/json' }, // If sending a body
  });

  if (!response || !response.id) {
    console.error(
      'Failed to acquire session or session ID missing in response:',
      response,
    );
    throw new Error('Failed to acquire session or session ID missing.');
  }
  console.log('Session acquired via API:', response.id);
  return response.id;
};

/**
 * Sends a message to the chat agent and gets a response.
 * @param {string} inputText - The text of the user's message.
 * @param {string} determinedUserId - The ID of the user. (Note: payload in original code used 'user')
 * @param {string} appName - The name of the application.
 * @param {string} sessionId - The current chat session ID.
 * @returns {Promise<object>} A promise that resolves with the bot's message object.
 * @throws {Error} If sending the message fails or the response is invalid.
 */
export const sendChatMessage = async (
  inputText,
  determinedUserId,
  appName,
  sessionId,
) => {
  const payload = {
    appName: appName,
    userId: 'user', // Or determinedUserId, depending on backend requirements for this field
    sessionId: sessionId,
    newMessage: {
      role: 'user',
      parts: [{ text: inputText }],
    },
    streaming: false, // Assuming streaming is false as per original code
  };

  console.log('Sending message via API with payload:', payload);
  const response = await callAuthenticatedApi('agent/run', {
    method: 'POST',
    body: payload, // callAuthenticatedApi should handle JSON.stringify if needed, or do it here
    headers: { 'Content-Type': 'application/json' },
  });

  console.log('Received API response for sendChatMessage:', response);

  if (!response || response.length === 0) {
    throw new Error('Invalid response structure from the bot (empty or null).');
  }

  const lastPart = response.at(-1);

  if (
    !lastPart ||
    !lastPart.content ||
    !lastPart.content.parts ||
    lastPart.content.parts.length === 0
  ) {
    throw new Error('Response does not contain expected content structure.');
  }

  const botText = lastPart.content.parts.at(-1).text;
  const botMessage = {
    id: lastPart.id || `bot-${Date.now()}`, // Use response ID or generate one
    role: 'model',
    text: await marked.parse(botText),
  };

  return botMessage;
};
