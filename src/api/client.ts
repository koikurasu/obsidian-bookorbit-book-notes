import { requestUrl } from 'obsidian';
import type {
	BookDetail,
	BookSearchResult,
	BookData,
} from './types';
import {
	BookOrbitAuthError,
	BookOrbitNetworkError,
	BookOrbitNotFoundError,
	BookOrbitResponseError,
} from './errors';

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
	private apiKey: string;

	constructor(baseUrl: string, apiKey: string) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.apiKey = apiKey;
	}

	private authHeaders(): Record<string, string> {
		return { 'X-Api-Key': this.apiKey };
	}

	private authError(response: { json?: unknown }): BookOrbitAuthError {
		return new BookOrbitAuthError(
			extractErrorMessage(response) ??
				'Authentication failed. Check your BookOrbit API key.',
		);
	}

	async testConnection(): Promise<void> {
		try {
			const response = await requestUrl({
				url: `${this.baseUrl}/api/v1/auth/me`,
				method: 'GET',
				headers: this.authHeaders(),
				throw: false,
			});

			if (response.status === 401) {
				throw this.authError(response);
			}

			if (response.status !== 200) {
				throw new BookOrbitResponseError(
					extractErrorMessage(response) ??
						`Connection test failed (HTTP ${response.status}).`,
				);
			}
		} catch (error) {
			if (
				error instanceof BookOrbitAuthError ||
				error instanceof BookOrbitResponseError
			) {
				throw error;
			}
			throw new BookOrbitNetworkError(
				`Network error during connection test: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async searchBooks(query: string, limit: number): Promise<BookSearchResult[]> {
		try {
			const searchUrl = new URL(`${this.baseUrl}/api/v1/books/search`);
			searchUrl.searchParams.set('q', query);
			searchUrl.searchParams.set('limit', String(limit));

			const response = await requestUrl({
				url: searchUrl.toString(),
				method: 'GET',
				headers: {
					...this.authHeaders(),
					'Content-Type': 'application/json',
				},
				throw: false,
			});

			if (response.status === 401) {
				throw this.authError(response);
			}

			if (response.status !== 200) {
				throw new BookOrbitResponseError(
					`Search failed (${response.status}).`,
				);
			}

			return response.json as BookSearchResult[];
		} catch (error) {
			if (
				error instanceof BookOrbitAuthError ||
				error instanceof BookOrbitResponseError
			) {
				throw error;
			}
			throw new BookOrbitNetworkError(
				`Network error during search: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	async getBookDetail(id: number, statusMap?: Record<string, string>): Promise<BookData> {
		try {
			const response = await requestUrl({
				url: `${this.baseUrl}/api/v1/books/${id}`,
				method: 'GET',
				headers: {
					...this.authHeaders(),
					'Content-Type': 'application/json',
				},
				throw: false,
			});

			if (response.status === 401) {
				throw this.authError(response);
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
				error instanceof BookOrbitAuthError ||
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
			const response = await requestUrl({
				url: `${this.baseUrl}/api/v1/books/${id}/thumbnail`,
				method: 'GET',
				headers: this.authHeaders(),
				throw: false,
			});

			if (response.status === 401) {
				throw this.authError(response);
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
			if (
				error instanceof BookOrbitAuthError ||
				error instanceof BookOrbitResponseError
			) {
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
