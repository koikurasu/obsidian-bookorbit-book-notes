import { SuggestModal, App, Notice, TFile } from 'obsidian';
import type { BookSearchResult, BookData } from '../api';

export class BookSearchModal extends SuggestModal<BookSearchResult> {
	private debounceTimer: number | null = null;
	private currentSearchId = 0;
	private searchFn: (query: string, limit: number) => Promise<BookSearchResult[]>;
	private getDetailFn: (id: number) => Promise<BookData>;
	private createNoteFn: (bookData: BookData) => Promise<TFile | null>;
	private maxSearchResults: number;

	constructor(
		app: App,
		searchFn: (query: string, limit: number) => Promise<BookSearchResult[]>,
		getDetailFn: (id: number) => Promise<BookData>,
		createNoteFn: (bookData: BookData) => Promise<TFile | null>,
		maxSearchResults: number,
	) {
		super(app);
		this.searchFn = searchFn;
		this.getDetailFn = getDetailFn;
		this.createNoteFn = createNoteFn;
		this.maxSearchResults = maxSearchResults;
		this.setPlaceholder('Search books by title...');
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
		const container = el.createDiv({ cls: 'bookorbit-suggestion' });

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
