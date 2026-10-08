import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestUrlMock = vi.fn();

vi.mock('obsidian', () => ({
	requestUrl: (...args: unknown[]) =>
		requestUrlMock(...args) as unknown,
}));

import { BookOrbitClient } from './client';
import { BookOrbitAuthError, BookOrbitNetworkError } from './errors';

interface MockCall {
	url: string;
	method: string;
	headers: Record<string, string>;
	body: string;
}

function callArgs(index: number): MockCall {
	const call = requestUrlMock.mock.calls[index]?.[0] as
		| MockCall
		| undefined;
	if (!call) {
		throw new Error(`Missing mock call at index ${index}`);
	}
	return call;
}

function jsonResponse(
	status: number,
	json: unknown,
	headers: Record<string, string> = {},
) {
	return {
		status,
		headers,
		json,
		text: JSON.stringify(json),
		arrayBuffer: new ArrayBuffer(0),
	};
}

describe('BookOrbitClient auth', () => {
	beforeEach(() => {
		requestUrlMock.mockReset();
	});

	it('sends clientKind native and reads tokens from the login body', async () => {
		requestUrlMock.mockResolvedValue(
			jsonResponse(200, {
				accessToken: 'access-1',
				accessTokenExpiresAt: '2026-10-08T00:30:00Z',
				refreshToken: 'refresh-1',
				refreshTokenExpiresAt: '2026-10-15T00:00:00Z',
				sessionId: 7,
			}),
		);

		const client = new BookOrbitClient(
			'https://example.com/',
			'user',
			'pass',
		);
		await client.login();

		expect(requestUrlMock).toHaveBeenCalledTimes(1);
		const call = callArgs(0);
		expect(call.url).toBe('https://example.com/api/v1/auth/login');
		expect(call.method).toBe('POST');
		expect(call.headers['Content-Type']).toBe('application/json');
		expect(JSON.parse(call.body)).toEqual({
			username: 'user',
			password: 'pass',
			clientKind: 'native',
		});
	});

	it('refreshes by sending the refresh token in the body, not a Cookie header', async () => {
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, {
				accessToken: 'access-1',
				refreshToken: 'refresh-1',
			}),
		);
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, {
				accessToken: 'access-2',
				refreshToken: 'refresh-2',
			}),
		);

		const client = new BookOrbitClient(
			'https://example.com',
			'user',
			'pass',
		);
		await client.login();
		await client.refresh();

		const refreshCall = callArgs(1);
		expect(refreshCall.url).toBe(
			'https://example.com/api/v1/auth/refresh',
		);
		expect(refreshCall.method).toBe('POST');
		expect(JSON.parse(refreshCall.body)).toEqual({
			refreshToken: 'refresh-1',
		});
		expect(refreshCall.headers.Cookie).toBeUndefined();
	});

	it('rotates the refresh token from the refresh response body', async () => {
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, {
				accessToken: 'access-1',
				refreshToken: 'refresh-1',
			}),
		);
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, {
				accessToken: 'access-2',
				refreshToken: 'refresh-2',
			}),
		);
		requestUrlMock.mockResolvedValue(
			jsonResponse(200, {
				accessToken: 'access-3',
				refreshToken: 'refresh-3',
			}),
		);

		const client = new BookOrbitClient(
			'https://example.com',
			'user',
			'pass',
		);
		await client.login();
		await client.refresh();
		await client.refresh();

		const secondRefreshCall = callArgs(2);
		expect(JSON.parse(secondRefreshCall.body)).toEqual({
			refreshToken: 'refresh-2',
		});
	});

	it('falls back to a case-insensitive Set-Cookie header when the body has no refresh token', async () => {
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(
				200,
				{ accessToken: 'access-cookie', sessionId: 1 },
				{ 'SET-COOKIE': 'refresh_token=cookie-token; HttpOnly; Path=/api/v1/auth' },
			),
		);
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, {
				accessToken: 'access-2',
				refreshToken: 'refresh-2',
			}),
		);

		const client = new BookOrbitClient(
			'https://example.com',
			'user',
			'pass',
		);
		await client.login();
		await client.refresh();

		const refreshCall = callArgs(1);
		expect(JSON.parse(refreshCall.body)).toEqual({
			refreshToken: 'cookie-token',
		});
		expect(refreshCall.headers.Cookie).toBeUndefined();
	});

	it('handles lowercase set-cookie header casing', async () => {
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(
				200,
				{ accessToken: 'access-lower' },
				{ 'set-cookie': 'refresh_token=lower-token; HttpOnly' },
			),
		);
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, {
				accessToken: 'access-2',
				refreshToken: 'refresh-2',
			}),
		);

		const client = new BookOrbitClient(
			'https://example.com',
			'user',
			'pass',
		);
		await client.login();
		await client.refresh();

		const refreshCall = callArgs(1);
		expect(JSON.parse(refreshCall.body)).toEqual({
			refreshToken: 'lower-token',
		});
	});

	it('throws an auth error with the server message on login failure', async () => {
		requestUrlMock.mockResolvedValue(
			jsonResponse(401, { message: 'Invalid credentials' }),
		);

		const client = new BookOrbitClient(
			'https://example.com',
			'user',
			'pass',
		);

		await expect(client.login()).rejects.toBeInstanceOf(BookOrbitAuthError);
		await expect(client.login()).rejects.toThrow('Invalid credentials');
	});

	it('throws an auth error when the login body has no access token', async () => {
		requestUrlMock.mockResolvedValue(
			jsonResponse(200, { refreshToken: 'only-refresh' }),
		);

		const client = new BookOrbitClient(
			'https://example.com',
			'user',
			'pass',
		);

		await expect(client.login()).rejects.toBeInstanceOf(BookOrbitAuthError);
		await expect(client.login()).rejects.toThrow(
			'Login response did not contain an access token.',
		);
	});

	it('wraps network failures in a network error', async () => {
		requestUrlMock.mockRejectedValue(new Error('Connection refused'));

		const client = new BookOrbitClient(
			'https://example.com',
			'user',
			'pass',
		);

		await expect(client.login()).rejects.toBeInstanceOf(
			BookOrbitNetworkError,
		);
		await expect(client.login()).rejects.toThrow('Connection refused');
	});

	it('testConnection propagates the real error', async () => {
		requestUrlMock.mockResolvedValue(
			jsonResponse(500, { message: 'Internal server error' }),
		);

		const client = new BookOrbitClient(
			'https://example.com',
			'user',
			'pass',
		);

		await expect(client.testConnection()).rejects.toThrow(
			'Internal server error',
		);
	});

	it('searchBooks sends the access token as a bearer token', async () => {
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, {
				accessToken: 'access-1',
				refreshToken: 'refresh-1',
			}),
		);
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, [{ id: 1, title: 'Book' }]),
		);

		const client = new BookOrbitClient(
			'https://example.com',
			'user',
			'pass',
		);
		await client.searchBooks('query', 10);

		const searchCall = callArgs(1);
		expect(searchCall.url).toBe(
			'https://example.com/api/v1/books/search?q=query&limit=10',
		);
		expect(searchCall.headers.Authorization).toBe('Bearer access-1');
	});

	it('searchBooks refreshes the token on a 401 and retries', async () => {
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, {
				accessToken: 'access-1',
				refreshToken: 'refresh-1',
			}),
		);
		// First search attempt: 401
		requestUrlMock.mockResolvedValueOnce(jsonResponse(401, {}));
		// Refresh succeeds
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, {
				accessToken: 'access-2',
				refreshToken: 'refresh-2',
			}),
		);
		// Retry succeeds
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, [{ id: 2, title: 'Book 2' }]),
		);

		const client = new BookOrbitClient(
			'https://example.com',
			'user',
			'pass',
		);
		const results = await client.searchBooks('query', 10);

		expect(results).toEqual([{ id: 2, title: 'Book 2' }]);
		const retryCall = callArgs(3);
		expect(retryCall.headers.Authorization).toBe('Bearer access-2');
	});

	it('searchBooks falls back to a full login when refresh fails on a 401', async () => {
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, {
				accessToken: 'access-1',
				refreshToken: 'refresh-1',
			}),
		);
		// First search attempt: 401
		requestUrlMock.mockResolvedValueOnce(jsonResponse(401, {}));
		// Refresh fails
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(401, { message: 'Refresh token revoked' }),
		);
		// Full login succeeds
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, {
				accessToken: 'access-3',
				refreshToken: 'refresh-3',
			}),
		);
		// Retry succeeds
		requestUrlMock.mockResolvedValueOnce(
			jsonResponse(200, [{ id: 3, title: 'Book 3' }]),
		);

		const client = new BookOrbitClient(
			'https://example.com',
			'user',
			'pass',
		);
		const results = await client.searchBooks('query', 10);

		expect(results).toEqual([{ id: 3, title: 'Book 3' }]);
		const retryCall = callArgs(4);
		expect(retryCall.headers.Authorization).toBe('Bearer access-3');
	});
});
