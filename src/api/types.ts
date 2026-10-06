// BookOrbit API response types

export interface BookSearchResult {
	id: number;
	title: string | null;
	seriesName: string | null;
	authors: string[];
	libraryId: number;
	libraryName: string;
	updatedAt: string | null;
	formats: string[];
}

export interface BookSeriesMembership {
	seriesId: number;
	seriesName: string;
	seriesIndex: string;
	displayOrder: number;
	expectedBookCount: number | null;
}

export interface BookCommunityRating {
	provider: string;
	rating: number;
	ratingCount: number;
	updatedAt: string;
}

export interface BookCoverSlot {
	source: string;
	updatedAt: string;
	width: number;
	height: number;
}

export interface ProviderIds {
	google: string | null;
	goodreads: string | null;
	amazon: string | null;
	hardcover: string | null;
	openLibrary: string | null;
	itunes: string | null;
	audible: string | null;
	librofm: string | null;
	kobo: string | null;
	comicvine: string | null;
	ranobedb: string | null;
	lubimyczytac: string | null;
	aladin: string | null;
}

export interface BookAuthor {
	id: number;
	name: string;
	sortName: string | null;
}

export interface BookFile {
	id: number;
	format: string;
	role: string;
	sizeBytes: number;
	absolutePath: string;
	createdAt: string;
	filename: string;
	durationSeconds: number | null;
	mediaOverlay: { available: boolean; durationSeconds: number | null } | null;
}

export interface ReadStatus {
	status: 'reading' | 'completed' | 'to-read' | 'dropped' | null;
	source: string;
	startedAt: string | null;
	finishedAt: string | null;
	updatedAt: string;
}

export interface AudioMetadata {
	narrators: { id: number; name: string }[] | null;
	durationSeconds: number | null;
	abridged: boolean;
	chapters:
		| {
				number: number;
				title: string;
				startOffsetMs: number;
				endOffsetMs: number;
		  }[]
		| null;
}

export interface ReadAloudSync {
	mode: string;
	overlayFileId: number | null;
	audioDurationSeconds: number | null;
	overlayDurationSeconds: number | null;
	durationDifferenceSeconds: number | null;
	durationDifferenceRatio: number | null;
	koreaderDownloadAvailable: boolean;
	state: string;
	unavailableReason: string | null;
}

export interface BookDetail {
	id: number;
	libraryId: number;
	libraryName: string;
	status: string;
	folderPath: string;
	addedAt: string;
	updatedAt: string;
	title: string | null;
	subtitle: string | null;
	description: string | null;
	isbn10: string | null;
	isbn13: string | null;
	publisher: string | null;
	publishedDate: string | null;
	publishedYear: number | null;
	language: string | null;
	pageCount: number | null;
	seriesId: number | null;
	seriesName: string | null;
	seriesIndex: string | null;
	seriesMemberships: BookSeriesMembership[];
	rating: number | null;
	personalNote: string | null;
	personalNoteUpdatedAt: string | null;
	communityRatings: BookCommunityRating[];
	coverSource: 'extracted' | 'custom' | null;
	coverMedia: string[];
	covers: {
		ebook: BookCoverSlot | null;
		audio: BookCoverSlot | null;
	};
	coverVersion: string;
	hardcoverEditionId: string | null;
	lockedFields: string[];
	providerIds: ProviderIds;
	authors: BookAuthor[];
	genres: string[];
	tags: string[];
	files: BookFile[];
	lastWrittenAt: string;
	metadataScore: number | null;
	readStatus: ReadStatus | null;
	audioMetadata: AudioMetadata | null;
	readAloudSync: ReadAloudSync;
	formatPriority: string[];
	customMetadata: { key: string; value: string }[];
	fileWriteStatus: {
		enabled: boolean;
		reason: string | null;
		writableFormats: string[];
		writableFields: string[];
	};
	collections: { id: number; name: string }[];
}

// Internal type combining all template variables
export interface BookData {
	title: string | null;
	subtitle: string | null;
	author: string;
	authors: string;
	authorsArray: string[];
	year: number | null;
	publishedYear: number | null;
	releaseDate: string | null;
	publishedDate: string | null;
	isbn: string | null;
	isbn13: string | null;
	isbn10: string | null;
	publisher: string | null;
	language: string | null;
	pages: number | null;
	pageCount: number | null;
	genres: string;
	genresArray: string[];
	plot: string | null;
	description: string | null;
	cover: string | null;
	image: string | null;
	biblioreadsUrl: string | null;
	hardcoverUrl: string | null;
	bookorbitUrl: string;
	bookorbitID: number;
	id: number;
	status: string;
	rating: number | null;
	startDate: string | null;
	startedAt: string | null;
	endDate: string | null;
	finishedAt: string | null;
	seriesName: string | null;
	seriesIndex: string | null;
	goodreadsRating: number | null;
	hardcoverRating: number | null;
	goodreadsID: string | null;
	goodreadsId: string | null;
	hardcoverID: string | null;
	hardcoverId: string | null;
	folderPath?: string;
	addedAt?: string;
	updatedAt?: string;
	libraryId?: number;
	libraryName?: string;
	seriesId?: number | null;
	personalNote?: string | null;
	[key: string]: unknown;
}

// Auth response types
export interface LoginResponse {
	accessToken: string;
}

export interface RefreshResponse {
	accessToken: string;
}
