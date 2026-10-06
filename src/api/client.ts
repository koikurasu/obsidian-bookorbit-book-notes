import { requestUrl } from 'obsidian';
import type {
	BookDetail,
	BookSearchResult,
	BookData,
	RefreshResponse,
} from './types';
import {
	BookOrbitAuthError,
	BookOrbitNetworkError,
	BookOrbitNotFoundError,
	BookOrbitResponseError,
} from './errors';

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
				}),
				throw: false,
			});

			if (response.status !== 200) {
				throw new BookOrbitAuthError(
					`Login failed (${response.status}). Check your credentials.`,
				);
			}

			const rawCookies = response.headers['set-cookie'] || '';
			const cookieString = Array.isArray(rawCookies)
				? rawCookies.join('; ')
				: String(rawCookies);
			const refreshMatch = cookieString.match(/refresh_token=([^;]+)/);

			if (!refreshMatch) {
				throw new BookOrbitAuthError(
					'Could not extract refresh token from login response.',
				);
			}

			this.refreshToken = refreshMatch[1] ?? null;

			const refreshResponse = await requestUrl({
				url: `${this.baseUrl}/api/v1/auth/refresh`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: `refresh_token=${this.refreshToken}`,
				},
				throw: false,
			});

			if (refreshResponse.status !== 200) {
				throw new BookOrbitAuthError(
					`Failed to refresh access token (${refreshResponse.status}).`,
				);
			}

			const refreshData = refreshResponse.json as RefreshResponse;
			if (!refreshData?.accessToken) {
				throw new BookOrbitAuthError(
					'Refresh response did not contain access token.',
				);
			}

			this.accessToken = refreshData.accessToken;
		} catch (error) {
			if (error instanceof BookOrbitAuthError) {
				throw error;
			}
			throw new BookOrbitNetworkError(
				`Network error during login: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.login();
			return true;
		} catch {
			return false;
		}
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
				// Token expired, try refresh
				this.accessToken = null;
				await this.login();
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

	async getBookDetail(id: number): Promise<BookData> {
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
				// Token expired, try refresh
				this.accessToken = null;
				await this.login();
				return this.getBookDetail(id);
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
			return this.mapToBookData(detail);
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
				// Token expired, try refresh
				this.accessToken = null;
				await this.login();
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

	private mapToBookData(detail: BookDetail): BookData {
		const authors = detail.authors.map((a) => a.name);
		const genres = detail.genres;

		// Find community ratings
		const goodreadsRating =
			detail.communityRatings.find((r) => r.provider === 'goodreads')
				?.rating || null;
		const hardcoverRating =
			detail.communityRatings.find((r) => r.provider === 'hardcover')
				?.rating || null;

		// Map read status to friendly string
		const statusMap: Record<string, string> = {
			reading: 'Reading',
			completed: 'Completed',
			'to-read': 'To Read',
			dropped: 'Dropped',
		};
		const status = detail.readStatus?.status
			? statusMap[detail.readStatus.status] || detail.readStatus.status
			: '';

		// Construct URLs
		const biblioreadsUrl = detail.providerIds.goodreads
			? `https://biblioreads.eu.org/book/show/${detail.providerIds.goodreads}`
			: null;
		const hardcoverUrl = detail.providerIds.hardcover
			? `https://hardcover.app/books/${detail.providerIds.hardcover}`
			: null;
		const bookorbitUrl = `${this.baseUrl}/book/${detail.id}`;

		return {
			title: detail.title,
			subtitle: detail.subtitle,
			author: authors.join(', '),
			authorsArray: authors,
			year: detail.publishedYear,
			releaseDate: detail.publishedDate,
			isbn: detail.isbn13,
			publisher: detail.publisher,
			language: detail.language,
			pages: detail.pageCount,
			genres: genres.join(', '),
			genresArray: genres,
			plot: detail.description,
			cover: null, // Will be set by caller if downloaded
			biblioreadsUrl,
			hardcoverUrl,
			bookorbitUrl,
			bookorbitID: detail.id,
			status,
			rating: detail.rating,
			startDate: detail.readStatus?.startedAt ?? null,
			endDate: detail.readStatus?.finishedAt ?? null,
			seriesName: detail.seriesName,
			seriesIndex: detail.seriesIndex,
			goodreadsRating,
			hardcoverRating,
			goodreadsID: detail.providerIds.goodreads,
			hardcoverID: detail.providerIds.hardcover,
		};
	}
}
