import { callAuthenticatedApi } from './apiClient';
// Mock NextAuth getSession at the top level
jest.mock('next-auth/react', () => ({
  getSession: jest.fn(),
}));
// Import the mocked getSession to use in tests
const { getSession } = require('next-auth/react');

describe('callAuthenticatedApi', () => {
  const endpoint = 'test-endpoint';
  const options = { method: 'POST', body: { data: 'test' } };
  const mockApiGatewayUrl = 'http://mock-api-gateway';
  let fetchSpy;

  beforeEach(() => {
    // Set the API Gateway URL for most tests
    process.env.NEXT_PUBLIC_API_GATEWAY_URL = mockApiGatewayUrl;

    // Clear all mock history and restore initial spies if any were set up globally
    jest.clearAllMocks();

    // Ensure global.fetch exists before spying
    global.fetch = jest.fn();
    // Spy on global.fetch for detailed call assertion and per-test mocking
    // jest.spyOn itself doesn't clear previous spies if not restored.
    // Ensure any previous spies are restored before creating a new one if using jest.restoreAllMocks in afterEach.
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    // Restore all mocks, including spies like fetchSpy, to their original state
    jest.restoreAllMocks();
  });

  it('should make a successful API call with a valid token', async () => {
    getSession.mockResolvedValueOnce({ idToken: 'valid-token' });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const result = await callAuthenticatedApi(endpoint, options);

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${mockApiGatewayUrl}/api/v1/${endpoint}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer valid-token' }),
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it('should attempt to refresh token on 401 and retry if successful', async () => {
    // Initial call
    getSession.mockResolvedValueOnce({ idToken: 'old-token' });
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    });

    // Refresh call (forced)
    getSession.mockResolvedValueOnce({ idToken: 'new-token', error: null });

    // Retry call - getSession at the start of the recursive call
    getSession.mockResolvedValueOnce({ idToken: 'new-token', error: null });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'Retried successfully' }),
    });

    const result = await callAuthenticatedApi(endpoint, options);

    expect(getSession).toHaveBeenCalledTimes(3);
    expect(getSession).toHaveBeenNthCalledWith(1); // Initial
    expect(getSession).toHaveBeenNthCalledWith(2, { force: true }); // Refresh
    expect(getSession).toHaveBeenNthCalledWith(3); // Start of retry
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true, message: 'Retried successfully' });
  });

  it('should throw an error if token refresh fails after 401', async () => {
    // Initial call
    getSession.mockResolvedValueOnce({ idToken: 'old-token' });
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    });

    // Refresh call (forced) - fails
    getSession.mockResolvedValueOnce({ idToken: null, error: 'RefreshFailedDude' });

    await expect(callAuthenticatedApi(endpoint, options)).rejects.toThrow('RefreshFailedDude');

    expect(getSession).toHaveBeenCalledTimes(2); // Initial + forced refresh
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Only the initial fetch
  });

  it('should throw an error if API call fails with non-401 error', async () => {
    getSession.mockResolvedValueOnce({ idToken: 'valid-token' });
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal Server Error' }),
    });

    await expect(callAuthenticatedApi(endpoint, options)).rejects.toThrow('Internal Server Error');
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if retried call also results in 401', async () => {
    // Initial call
    getSession.mockResolvedValueOnce({ idToken: 'old-token' });
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized attempt 1' }),
    });

    // Refresh call (forced) - successful
    getSession.mockResolvedValueOnce({ idToken: 'new-token', error: null });

    // Retry call - getSession at the start of the recursive call
    getSession.mockResolvedValueOnce({ idToken: 'new-token', error: null });
    // Retry call - fetch fails again with 401
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized attempt 2' }),
    });

    await expect(callAuthenticatedApi(endpoint, options)).rejects.toThrow('Unauthorized attempt 2');
    expect(getSession).toHaveBeenCalledTimes(3);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle 204 No Content responses', async () => {
    getSession.mockResolvedValueOnce({ idToken: 'valid-token' });
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const result = await callAuthenticatedApi(endpoint, options);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it('should throw error if API Gateway URL is not configured', async () => {
    process.env.NEXT_PUBLIC_API_GATEWAY_URL = ''; // Unset for this test
    // getSession might be called before the URL check, so mock it.
    getSession.mockResolvedValueOnce({ idToken: 'valid-token' });

    await expect(callAuthenticatedApi(endpoint, options)).rejects.toThrow(
      'API Gateway URL is not configured. Check NEXT_PUBLIC_API_GATEWAY_URL.',
    );
    // fetch should not be called if URL is missing.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should throw error if session or idToken is missing', async () => {
    getSession.mockResolvedValueOnce(null); // No session
    await expect(callAuthenticatedApi(endpoint, options)).rejects.toThrow('Authentication required.');

    getSession.mockResolvedValueOnce({ idToken: null }); // Session exists but no idToken
    await expect(callAuthenticatedApi(endpoint, options)).rejects.toThrow('Authentication required.');

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
