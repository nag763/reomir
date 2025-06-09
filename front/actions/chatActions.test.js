// front/actions/chatActions.test.js
import { acquireChatSession, sendChatMessage } from './chatActions';
import { callAuthenticatedApi } from '@/lib/apiClient';
import { marked } from 'marked';

jest.mock('@/lib/apiClient', () => ({
  callAuthenticatedApi: jest.fn(),
}));

// If `import { marked } from 'marked'` is used, then 'marked' module exports a 'marked' object.
jest.mock('marked', () => ({
  marked: {
    parse: jest.fn((text) => Promise.resolve(`parsed_${text}`)),
  }
}));

describe('chatActions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('acquireChatSession', () => {
    const determinedUserId = 'testUser';
    const appName = 'testApp';

    it('should acquire a session successfully', async () => {
      const mockSessionId = 'session123';
      callAuthenticatedApi.mockResolvedValueOnce({ id: mockSessionId });

      const sessionId = await acquireChatSession(determinedUserId, appName);

      expect(callAuthenticatedApi).toHaveBeenCalledWith('agent/session', {
        method: 'GET',
        headers: { 'X-App': 'coordinator' },
      });
      expect(sessionId).toBe(mockSessionId);
    });

    it('should throw an error if API call fails', async () => {
      callAuthenticatedApi.mockRejectedValueOnce(new Error('API Error'));

      await expect(acquireChatSession(determinedUserId, appName)).rejects.toThrow('API Error');
    });

    it('should throw an error if response is invalid or session ID is missing', async () => {
      callAuthenticatedApi.mockResolvedValueOnce({}); // Missing id
      await expect(acquireChatSession(determinedUserId, appName)).rejects.toThrow('Failed to acquire session or session ID missing.');

      callAuthenticatedApi.mockResolvedValueOnce(null); // Null response
      await expect(acquireChatSession(determinedUserId, appName)).rejects.toThrow('Failed to acquire session or session ID missing.');
    });
  });

  describe('sendChatMessage', () => {
    const inputText = 'Hello bot';
    const determinedUserId = 'testUser';
    const appName = 'testApp';
    const sessionId = 'session123';

    const mockApiResponse = [
      { id: 'msg1', role: 'user', content: { parts: [{ text: 'Hello bot' }] } },
      { id: 'msg2', role: 'model', content: { parts: [{ text: 'Hello user' }] } },
    ];

    it('should send a message and process the response successfully', async () => {
      callAuthenticatedApi.mockResolvedValueOnce(mockApiResponse);

      const botMessage = await sendChatMessage(inputText, determinedUserId, appName, sessionId);

      expect(callAuthenticatedApi).toHaveBeenCalledWith('agent/run', {
        method: 'POST',
        body: {
          appName,
          userId: determinedUserId,
          sessionId,
          newMessage: {
            role: 'user',
            parts: [{ text: inputText }],
          },
          streaming: false,
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(marked.parse).toHaveBeenCalledWith('Hello user');
      expect(botMessage).toEqual({
        id: 'msg2',
        role: 'model',
        text: 'parsed_Hello user',
      });
    });

    it('should use a generated ID if response ID is missing for bot message', async () => {
      const apiResponseNoId = [
        { id: 'msg1', role: 'user', content: { parts: [{ text: 'Hello bot' }] } },
        { role: 'model', content: { parts: [{ text: 'Hello again' }] } }, // No id for bot message
      ];
      callAuthenticatedApi.mockResolvedValueOnce(apiResponseNoId);
      jest.spyOn(Date, 'now').mockReturnValue(1234567890); // Mock Date.now() for predictable ID

      const botMessage = await sendChatMessage(inputText, determinedUserId, appName, sessionId);
      expect(botMessage.id).toBe('bot-1234567890');
      expect(botMessage.text).toBe('parsed_Hello again');

      jest.spyOn(Date, 'now').mockRestore(); // Restore Date.now
    });

    it('should throw an error if API call fails', async () => {
      callAuthenticatedApi.mockRejectedValueOnce(new Error('API Send Error'));

      await expect(sendChatMessage(inputText, determinedUserId, appName, sessionId)).rejects.toThrow('API Send Error');
    });

    it('should throw an error for invalid API response structure', async () => {
      callAuthenticatedApi.mockResolvedValueOnce(null); // Null response
      await expect(sendChatMessage(inputText, determinedUserId, appName, sessionId)).rejects.toThrow('Invalid response structure from the bot (empty or null).');

      callAuthenticatedApi.mockResolvedValueOnce([]); // Empty array
      await expect(sendChatMessage(inputText, determinedUserId, appName, sessionId)).rejects.toThrow('Invalid response structure from the bot (empty or null).');

      callAuthenticatedApi.mockResolvedValueOnce([{ content: null }]); // Missing parts
      await expect(sendChatMessage(inputText, determinedUserId, appName, sessionId)).rejects.toThrow('Response does not contain expected content structure.');

      callAuthenticatedApi.mockResolvedValueOnce([{ content: { parts: [] } }]); // Empty parts
      await expect(sendChatMessage(inputText, determinedUserId, appName, sessionId)).rejects.toThrow('Response does not contain expected content structure.');
    });
  });
});
