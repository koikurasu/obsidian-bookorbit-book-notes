import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestUrlMock = vi.fn();

vi.mock('obsidian', () => ({
	requestUrl: (...args: unknown[]) =>
		requestUrlMock(...args) as unknown,
}));

import { BookOrbitClient } from './client';
import {
	BookOrbitAuthError,
	BookOrbitNetworkError,
	BookOrbitResponseError,
} from './errors';

interface MockCall {
	url: string;
	method: string;
	headers: Record<string, string>;
	body?: string;
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

	it('testConnection calls auth/me with the API key header', async () => {
		requestUrlMock.mockResolvedValue(jsonResponse(200, { id: 1 }));

		const client = new BookOrbitClient('https://example.com/', 'secret-key');
		await client.testConnection();

		expect(requestUrlMock).toHaveBeenCalledTimes(1);
		const call = callArgs(0);
		expect(call.url).toBe('https://example.com/api/v1/auth/me');
		expect(call.method).toBe('GET');
		expect(call.headers['X-Api-Key']).toBe('secret-key');
	});

	it('throws an auth error with the server message on a 401', async () => {
		requestUrlMock.mockResolvedValue(
			jsonResponse(401, { message: 'Invalid API key' }),
		);

		const client = new BookOrbitClient('https://example.com', 'bad-key');

		await expect(client.testConnection()).rejects.toBeInstanceOf(
			BookOrbitAuthError,
		);
		await expect(client.testConnection()).rejects.toThrow(
			'Invalid API key',
		);
	});

	it('throws a response error on non-200, non-401 statuses', async () => {
		requestUrlMock.mockResolvedValue(
			jsonResponse(500, { message: 'Internal server error' }),
		);

		const client = new BookOrbitClient('https://example.com', 'key');

		await expect(client.testConnection()).rejects.toBeInstanceOf(
			BookOrbitResponseError,
		);
		await expect(client.testConnection()).rejects.toThrow(
			'Internal server error',
		);
	});

	it('wraps network failures in a network error', async () => {
		requestUrlMock.mockRejectedValue(new Error('Connection refused'));

		const client = new BookOrbitClient('https://example.com', 'key');

		await expect(client.testConnection()).rejects.toBeInstanceOf(
			BookOrbitNetworkError,
		);
		await expect(client.testConnection()).rejects.toThrow(
			'Connection refused',
		);
	});

	it('searchBooks sends the API key header', async () => {
		requestUrlMock.mockResolvedValue(
			jsonResponse(200, [{ id: 1, title: 'Book' }]),
		);

		const client = new BookOrbitClient('https://example.com', 'secret-key');
		const results = await client.searchBooks('query', 10);

		expect(results).toEqual([{ id: 1, title: 'Book' }]);
		const call = callArgs(0);
		expect(call.url).toBe(
			'https://example.com/api/v1/books/search?q=query&limit=10',
		);
		expect(call.headers['X-Api-Key']).toBe('secret-key');
		expect(call.headers.Authorization).toBeUndefined();
	});

	it('searchBooks throws an auth error on a 401', async () => {
		requestUrlMock.mockResolvedValue(jsonResponse(401, {}));

		const client = new BookOrbitClient('https://example.com', 'bad-key');

		await expect(client.searchBooks('query', 10)).rejects.toBeInstanceOf(
			BookOrbitAuthError,
		);
	});

	it('getBookDetail sends the API key header', async () => {
		requestUrlMock.mockResolvedValue(
			jsonResponse(200, {
				id: 5,
				title: 'Book',
				authors: [],
				genres: [],
				communityRatings: [],
				providerIds: {},
				readStatus: null,
			}),
		);

		const client = new BookOrbitClient('https://example.com', 'secret-key');
		const book = await client.getBookDetail(5);

		expect(book.id).toBe(5);
		const call = callArgs(0);
		expect(call.url).toBe('https://example.com/api/v1/books/5');
		expect(call.headers['X-Api-Key']).toBe('secret-key');
	});

	it('downloadCover sends the API key header', async () => {
		requestUrlMock.mockResolvedValue(
			jsonResponse(200, {}, { 'content-type': 'image/jpeg' }),
		);

		const client = new BookOrbitClient('https://example.com', 'secret-key');
		const cover = await client.downloadCover(5);

		expect(cover).not.toBeNull();
		const call = callArgs(0);
		expect(call.url).toBe(
			'https://example.com/api/v1/books/5/thumbnail',
		);
		expect(call.headers['X-Api-Key']).toBe('secret-key');
	});
});
