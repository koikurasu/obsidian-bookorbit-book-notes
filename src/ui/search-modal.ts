import { SuggestModal, App, Notice, TFile } from 'obsidian';
import type { BookSearchResult, BookData } from '../api';

const THUMBNAIL_CACHE = new Map<number, string>();
const MAX_CACHE_SIZE = 50;

function getCachedThumbnail(bookId: number): string | undefined {
	return THUMBNAIL_CACHE.get(bookId);
}

function setCachedThumbnail(bookId: number, blobUrl: string): void {
	if (THUMBNAIL_CACHE.size >= MAX_CACHE_SIZE) {
		const firstKey = THUMBNAIL_CACHE.keys().next().value;
		if (firstKey !== undefined) {
			const oldUrl = THUMBNAIL_CACHE.get(firstKey);
			if (oldUrl) URL.revokeObjectURL(oldUrl);
			THUMBNAIL_CACHE.delete(firstKey);
		}
	}
	THUMBNAIL_CACHE.set(bookId, blobUrl);
}

export class BookSearchModal extends SuggestModal<BookSearchResult> {
	private debounceTimer: number | null = null;
	private currentSearchId = 0;
	private searchFn: (query: string, limit: number) => Promise<BookSearchResult[]>;
	private getDetailFn: (id: number) => Promise<BookData>;
	private createNoteFn: (bookData: BookData) => Promise<TFile | null>;
	private thumbnailFn: ((id: number) => Promise<{ data: ArrayBuffer; contentType: string } | null>) | null = null;
	private maxSearchResults: number;

	constructor(
		app: App,
		searchFn: (query: string, limit: number) => Promise<BookSearchResult[]>,
		getDetailFn: (id: number) => Promise<BookData>,
		createNoteFn: (bookData: BookData) => Promise<TFile | null>,
		maxSearchResults: number,
		thumbnailFn?: (id: number) => Promise<{ data: ArrayBuffer; contentType: string } | null>,
	) {
		super(app);
		this.searchFn = searchFn;
		this.getDetailFn = getDetailFn;
		this.createNoteFn = createNoteFn;
		this.thumbnailFn = thumbnailFn ?? null;
		this.maxSearchResults = maxSearchResults;
		this.setPlaceholder('Search books by title or author...');
	}

	override onOpen(): void {
		void super.onOpen();
		this.inputEl.focus();
	}

	override onClose(): void {
		super.onClose();
		this.currentSearchId++;
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}

	renderSuggestion(result: BookSearchResult, el: HTMLElement): void {
		el.empty();

		const container = el.createDiv({ cls: 'bookorbit-suggestion' });

		const thumbnail = container.createEl('img', { cls: 'bookorbit-thumbnail' });
		thumbnail.dataset.bookId = String(result.id);
		thumbnail.alt = result.title || 'Book cover';

		const cachedUrl = getCachedThumbnail(result.id);
		if (cachedUrl) {
			thumbnail.src = cachedUrl;
		} else if (this.thumbnailFn) {
			thumbnail.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
			void this.loadThumbnail(result.id, thumbnail);
		}

		const info = container.createDiv({ cls: 'bookorbit-info' });

		const title = info.createDiv({ cls: 'bookorbit-title' });
		title.setText(result.title || 'Untitled');

		if (result.authors.length > 0) {
			const authors = info.createDiv({ cls: 'bookorbit-authors' });
			authors.setText(result.authors.join(', '));
		}

		if (result.seriesName) {
			const series = info.createDiv({ cls: 'bookorbit-series' });
			series.setText(result.seriesName);
		}
	}

	private async loadThumbnail(bookId: number, thumbnail: HTMLImageElement): Promise<void> {
		if (!this.thumbnailFn) return;

		try {
			const coverData = await this.thumbnailFn(bookId);
			if (coverData && coverData.data) {
				const blob = new Blob([coverData.data], { type: coverData.contentType || 'image/jpeg' });
				const blobUrl = URL.createObjectURL(blob);
				setCachedThumbnail(bookId, blobUrl);

				if (thumbnail.dataset.bookId === String(bookId)) {
					thumbnail.src = blobUrl;
				}
			}
		} catch {
			// Leave placeholder on error
		}
	}

	onChooseSuggestion(result: BookSearchResult): void {
		this.close();

		const loadingNotice = new Notice('Loading book details...');

		void (async () => {
			try {
				const bookData = await this.getDetailFn(result.id);
				await this.createNoteFn(bookData);
				loadingNotice.hide();
			} catch (error) {
				loadingNotice.hide();
				new Notice(`Failed to create note: ${error instanceof Error ? error.message : String(error)}`);
			}
		})();
	}

	getSuggestions(query: string): BookSearchResult[] | Promise<BookSearchResult[]> {
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}

		if (!query.trim()) {
			return [];
		}

		const searchId = ++this.currentSearchId;

		return new Promise((resolve) => {
			this.debounceTimer = window.setTimeout(() => {
				void (async () => {
					try {
						const results = await this.searchFn(query, this.maxSearchResults);
						if (searchId === this.currentSearchId) {
							resolve(results);
						}
					} catch (error) {
						if (searchId === this.currentSearchId) {
							new Notice(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
							resolve([]);
						}
					}
				})();
			}, 300);
		});
	}
}
