import { requestUrl } from 'obsidian';
import type {
	BookDetail,
	BookSearchResult,
	BookData,
	RefreshResponse,
	LoginResponse,
} from './types';
import {
	BookOrbitAuthError,
	BookOrbitNetworkError,
	BookOrbitNotFoundError,
	BookOrbitResponseError,
} from './errors';

function extractRefreshTokenFromHeaders(
	headers: Record<string, string> | undefined,
): string | null {
	if (!headers) {
		return null;
	}
	// The set-cookie header may be exposed as a single string or, on
	// some platforms, as several values. Collect every value so the
	// refresh_token cookie is found regardless of ordering.
	const values: string[] = [];
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === 'set-cookie') {
			values.push(value);
		}
	}
	const match = values.join('; ').match(/refresh_token=([^;]+)/);
	return match?.[1] ?? null;
}

function extractErrorMessage(response: {
	json?: unknown;
}): string | null {
	const body = response.json as { message?: unknown } | null | undefined;
	if (body && typeof body === 'object' && typeof body.message === 'string') {
		return body.message;
	}
	return null;
}

export class BookOrbitClient {
	private baseUrl: string;
	private username: string;
	private password: string;
	private accessToken: string | null = null;
	private refreshToken: string | null = null;

	constructor(baseUrl: string, username: string, password: string) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.username = username;
		this.password = password;
	}

	private async ensureAuth(): Promise<string> {
		if (this.accessToken) {
			return this.accessToken;
		}
		await this.login();
		if (!this.accessToken) {
			throw new BookOrbitAuthError('Failed to obtain access token');
		}
		return this.accessToken;
	}

	async login(): Promise<void> {
		try {
			const response = await requestUrl({
				url: `${this.baseUrl}/api/v1/auth/login`,
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: this.username,
					password: this.password,
					clientKind: 'native',
				}),
				throw: false,
			});

			if (response.status !== 200) {
				const detail = extractErrorMessage(response);
				if (response.status === 401) {
					throw new BookOrbitAuthError(
						detail ?? 'Login failed: invalid username or password.',
					);
				}
				throw new BookOrbitAuthError(
					detail ?? `Login failed (HTTP ${response.status}).`,
				);
			}

			const data = response.json as LoginResponse | null | undefined;
			const accessToken = data?.accessToken;
			if (!accessToken) {
				throw new BookOrbitAuthError(
					'Login response did not contain an access token.',
				);
			}
			this.accessToken = accessToken;

			// Prefer the refresh token from the JSON body, which BookOrbit
			// returns for native clients (clientKind: 'native'). Fall back to
			// the Set-Cookie header only for servers that deliver it solely as
			// a cookie. Reading Set-Cookie is unreliable on Obsidian mobile, so
			// the body path is the one that works on iOS.
			this.refreshToken =
				data?.refreshToken ??
				extractRefreshTokenFromHeaders(response.headers) ??
				null;
		} catch (error) {
			if (error instanceof BookOrbitAuthError) {
				throw error;
			}
			throw new BookOrbitNetworkError(
				`Network error during login: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async refresh(): Promise<void> {
		if (!this.refreshToken) {
			throw new BookOrbitAuthError(
				'No refresh token available. Please log in again.',
			);
		}
		try {
			const response = await requestUrl({
				url: `${this.baseUrl}/api/v1/auth/refresh`,
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken: this.refreshToken }),
				throw: false,
			});

			if (response.status !== 200) {
				const detail = extractErrorMessage(response);
				throw new BookOrbitAuthError(
					detail ??
						`Session expired (HTTP ${response.status}). Please log in again.`,
				);
			}

			const data = response.json as RefreshResponse | null | undefined;
			const accessToken = data?.accessToken;
			if (!accessToken) {
				throw new BookOrbitAuthError(
					'Refresh response did not contain an access token.',
				);
			}
			this.accessToken = accessToken;
			// BookOrbit rotates the refresh token on each refresh for native
			// sessions; use the new one when the server returns it.
			if (data?.refreshToken) {
				this.refreshToken = data.refreshToken;
			}
		} catch (error) {
			if (error instanceof BookOrbitAuthError) {
				throw error;
			}
			throw new BookOrbitNetworkError(
				`Network error during token refresh: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async testConnection(): Promise<void> {
		await this.login();
	}

	async searchBooks(query: string, limit: number): Promise<BookSearchResult[]> {
		try {
			const token = await this.ensureAuth();

			const searchUrl = new URL(`${this.baseUrl}/api/v1/books/search`);
			searchUrl.searchParams.set('q', query);
			searchUrl.searchParams.set('limit', String(limit));

			const response = await requestUrl({
				url: searchUrl.toString(),
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				throw: false,
			});

			if (response.status === 401) {
				// Token expired: try a refresh, then fall back to a full login.
				this.accessToken = null;
				try {
					await this.refresh();
				} catch {
					await this.login();
				}
				return this.searchBooks(query, limit);
			}

			if (response.status !== 200) {
				throw new BookOrbitResponseError(
					`Search failed (${response.status}).`,
				);
			}

			return response.json as BookSearchResult[];
		} catch (error) {
			if (error instanceof BookOrbitResponseError) {
				throw error;
			}
			throw new BookOrbitNetworkError(
				`Network error during search: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async getBookDetail(id: number, statusMap?: Record<string, string>): Promise<BookData> {
		try {
			const token = await this.ensureAuth();

			const response = await requestUrl({
				url: `${this.baseUrl}/api/v1/books/${id}`,
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				throw: false,
			});

			if (response.status === 401) {
				// Token expired: try a refresh, then fall back to a full login.
				this.accessToken = null;
				try {
					await this.refresh();
				} catch {
					await this.login();
				}
				return this.getBookDetail(id, statusMap);
			}

			if (response.status === 404) {
				throw new BookOrbitNotFoundError(`Book ${id} not found.`);
			}

			if (response.status !== 200) {
				throw new BookOrbitResponseError(
					`Failed to fetch book details (${response.status}).`,
				);
			}

			const detail = response.json as BookDetail;
			return this.mapToBookData(detail, statusMap);
		} catch (error) {
			if (
				error instanceof BookOrbitResponseError ||
				error instanceof BookOrbitNotFoundError
			) {
				throw error;
			}
			throw new BookOrbitNetworkError(
				`Network error fetching book details: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async downloadCover(
		id: number,
	): Promise<{ data: ArrayBuffer; contentType: string } | null> {
		try {
			const token = await this.ensureAuth();

			const response = await requestUrl({
				url: `${this.baseUrl}/api/v1/books/${id}/thumbnail`,
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				throw: false,
			});

			if (response.status === 401) {
				// Token expired: try a refresh, then fall back to a full login.
				this.accessToken = null;
				try {
					await this.refresh();
				} catch {
					await this.login();
				}
				return this.downloadCover(id);
			}

			if (response.status === 404) {
				return null;
			}

			if (response.status !== 200) {
				throw new BookOrbitResponseError(
					`Failed to download cover (${response.status}).`,
				);
			}

			const contentType =
				response.headers['content-type'] || 'image/jpeg';

			return {
				data: response.arrayBuffer,
				contentType,
			};
		} catch (error) {
			if (error instanceof BookOrbitResponseError) {
				throw error;
			}
			throw new BookOrbitNetworkError(
				`Network error downloading cover: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private mapToBookData(detail: BookDetail, statusMap?: Record<string, string>): BookData {
		const authors = detail.authors.map((a) => a.name);
		const genres = detail.genres;

		// Find community ratings
		const goodreadsRating =
			detail.communityRatings.find((r) => r.provider === 'goodreads')
				?.rating || null;
		const hardcoverRating =
			detail.communityRatings.find((r) => r.provider === 'hardcover')
				?.rating || null;

		// Map read status using caller-supplied map, with built-in fallback.
		// Keys must match the lowercase BookOrbit API values (see READ_STATUSES).
		const resolvedStatusMap: Record<string, string> = Object.assign(
			{
				unread: 'Unread',
				want_to_read: 'Want to read',
				reading: 'Reading',
				on_hold: 'On hold',
				rereading: 'Rereading',
				read: 'Read',
				skimmed: 'Skimmed',
				abandoned: 'Abandoned',
			},
			statusMap ?? {},
		);
		const status = detail.readStatus?.status
			? resolvedStatusMap[detail.readStatus.status] || detail.readStatus.status
			: '';

		// Construct URLs
		const goodreadsId = detail.providerIds?.goodreads ?? null;
		const hardcoverId = detail.providerIds?.hardcover ?? null;
		const goodreadsUrl = goodreadsId
			? `https://www.goodreads.com/book/show/${goodreadsId}`
			: null;
		const biblioreadsUrl = goodreadsId
			? `https://biblioreads.eu.org/book/show/${goodreadsId}`
			: null;
		const hardcoverUrl = hardcoverId
			? `https://hardcover.app/books/${hardcoverId}`
			: null;
		const bookorbitUrl = `${this.baseUrl}/book/${detail.id}`;

		const isbn = detail.isbn13 || detail.isbn10 || null;
		const startedAt = detail.readStatus?.startedAt ?? null;
		const finishedAt = detail.readStatus?.finishedAt ?? null;

		return {
			title: detail.title,
			subtitle: detail.subtitle,
			author: authors.join(', '),
			authors: authors.join(', '),
			authorsArray: authors,
			year: detail.publishedYear,
			publishedYear: detail.publishedYear,
			releaseDate: detail.publishedDate,
			publishedDate: detail.publishedDate,
			isbn,
			isbn13: detail.isbn13,
			isbn10: detail.isbn10,
			publisher: detail.publisher,
			language: detail.language,
			pages: detail.pageCount,
			pageCount: detail.pageCount,
			genres: genres.join(', '),
			genresArray: genres,
			plot: detail.description,
			description: detail.description,
			cover: null, // Will be set by caller if downloaded
			image: null,
		biblioreadsUrl,
		goodreadsUrl,
		hardcoverUrl,
		bookorbitUrl,
			bookorbitID: detail.id,
			id: detail.id,
			status,
			rating: detail.rating,
			startDate: startedAt,
			startedAt,
			endDate: finishedAt,
			finishedAt,
			seriesName: detail.seriesName,
			seriesIndex: detail.seriesIndex,
			goodreadsRating,
			hardcoverRating,
			goodreadsID: goodreadsId,
			goodreadsId,
			hardcoverID: hardcoverId,
			hardcoverId,
			folderPath: detail.folderPath,
			addedAt: detail.addedAt,
			updatedAt: detail.updatedAt,
			libraryId: detail.libraryId,
			libraryName: detail.libraryName,
			seriesId: detail.seriesId,
			personalNote: detail.personalNote,
		};
	}
}
