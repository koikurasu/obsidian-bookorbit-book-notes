import { Plugin, Notice, TFile } from 'obsidian';
import { BookOrbitClient } from './api';
import { DEFAULT_TEMPLATE } from './template';
import { createBookNote, type NoteCreationOptions, updateBookNote } from './notes';
import { BookSearchModal } from './ui';
import { DEFAULT_SETTINGS, BookOrbitSettingTab, type BookOrbitSettings } from './settings';

export default class BookOrbitPlugin extends Plugin {
	settings!: BookOrbitSettings;
	client: BookOrbitClient | null = null;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon('book-open', 'Search books', () => {
			void this.openSearchModal();
		});

		// Add command
		this.addCommand({
			id: 'search',
			name: 'Search books',
			callback: () => {
				void this.openSearchModal();
			},
		});

		// Add update command
		this.addCommand({
			id: 'update-current-note',
			name: 'Update current book note',
			callback: () => {
				void this.updateCurrentNote();
			},
		});

		// Add settings tab
		this.addSettingTab(new BookOrbitSettingTab(this));
	}

	onunload() {
		// Clean up any resources
		this.client = null;
	}

	async loadSettings() {
		const saved = (await this.loadData()) as Partial<BookOrbitSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
		// Merge statusMap so new default keys appear even in existing saved data
		this.settings.statusMap = Object.assign(
			{},
			DEFAULT_SETTINGS.statusMap,
			saved?.statusMap ?? {},
		);
		// Merge updateMappings by templateVar so new defaults appear in existing vaults
		const savedMappings = new Map(
			(saved?.updateMappings ?? []).map((m) => [m.templateVar, m]),
		);
		this.settings.updateMappings = DEFAULT_SETTINGS.updateMappings.map(
			(def) => savedMappings.get(def.templateVar) ?? def,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async getPassword(): Promise<string> {
		if (this.settings.passwordSecret && this.app.secretStorage) {
			const secret = this.app.secretStorage.getSecret(this.settings.passwordSecret);
			if (secret) {
				return secret;
			}
		}
		return this.settings.password || '';
	}

	async testConnection(): Promise<boolean> {
		const password = await this.getPassword();
		if (!this.settings.serverUrl || !this.settings.username || !password) {
			return false;
		}

		try {
			this.client = new BookOrbitClient(
				this.settings.serverUrl,
				this.settings.username,
				password,
			);
			return await this.client.testConnection();
		} catch {
			return false;
		}
	}

	private async openSearchModal(): Promise<void> {
		const password = await this.getPassword();
		if (!this.settings.serverUrl || !this.settings.username || !password) {
			new Notice('Please configure your BookOrbit connection in settings.');
			return;
		}

		// Initialize client if not already
		if (!this.client) {
			this.client = new BookOrbitClient(
				this.settings.serverUrl,
				this.settings.username,
				password,
			);
		}
		const client = this.client;

		// Get template content
		const template = this.settings.templatePath
			? await this.getTemplateContent(this.settings.templatePath)
			: DEFAULT_TEMPLATE;

		// Prepare note creation options
		const noteOptions: NoteCreationOptions = {
			outputFolder: this.settings.outputFolder,
			filenameTemplate: this.settings.filenameTemplate,
			template,
			dateFormat: this.settings.dateFormat,
			downloadCovers: this.settings.downloadCovers,
			coverFolder: this.settings.coverFolder,
			openNoteAfterCreation: this.settings.openNoteAfterCreation,
			bookorbitUrl: this.settings.serverUrl,
		};

		// Open modal
		new BookSearchModal(
			this.app,
			async (query: string, limit: number) => {
				return await client.searchBooks(query, limit);
			},
			async (id: number) => {
				return await client.getBookDetail(id, this.settings.statusMap);
			},
			async (bookData) => {
				const downloadCoverFn = async (bookId: number) => {
					return await client.downloadCover(bookId);
				};

				return await createBookNote(this.app, bookData, noteOptions, downloadCoverFn);
			},
			this.settings.maxSearchResults,
		).open();
	}

	private async getTemplateContent(path: string): Promise<string> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			try {
				return await this.app.vault.read(file);
			} catch {
				return DEFAULT_TEMPLATE;
			}
		}
		return DEFAULT_TEMPLATE;
	}

	private async updateCurrentNote(): Promise<void> {
		const file = this.app.workspace.getActiveFile();
		if (!file) {
			new Notice('No active file.');
			return;
		}

		const cache = this.app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;
		if (!fm) {
			new Notice('Active file has no frontmatter.');
			return;
		}

		const idKey = this.settings.bookorbitIdKey;
		const rawId = (fm as Record<string, unknown>)[idKey];
		if (rawId === undefined || rawId === null) {
			new Notice(`Active file doesn't have a "${idKey}" property.`);
			return;
		}

		const bookorbitId = Number(rawId);
		if (!Number.isFinite(bookorbitId)) {
			new Notice(`"${idKey}" is not a valid number.`);
			return;
		}

		const password = await this.getPassword();
		if (!this.settings.serverUrl || !this.settings.username || !password) {
			new Notice('Please configure your BookOrbit connection in settings.');
			return;
		}

		if (!this.client) {
			this.client = new BookOrbitClient(
				this.settings.serverUrl,
				this.settings.username,
				password,
			);
		}

		try {
			new Notice('Fetching book data…');
			const bookData = await this.client.getBookDetail(
				bookorbitId,
				this.settings.statusMap,
			);
			await updateBookNote(this.app, file, bookData, {
				mappings: this.settings.updateMappings,
				bookorbitIdKey: this.settings.bookorbitIdKey,
				dateFormat: this.settings.dateFormat,
				filenameTemplate: this.settings.filenameTemplate,
				outputFolder: this.settings.outputFolder,
			});
		} catch (err) {
			new Notice(
				`Failed to update: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}
}
