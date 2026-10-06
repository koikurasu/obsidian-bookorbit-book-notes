import { Plugin, Notice, TFile } from 'obsidian';
import { BookOrbitClient } from './api';
import { DEFAULT_TEMPLATE } from './template';
import { createBookNote, type NoteCreationOptions } from './notes';
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

		// Add settings tab
		this.addSettingTab(new BookOrbitSettingTab(this));
	}

	onunload() {
		// Clean up any resources
		this.client = null;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<BookOrbitSettings> | null,
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
				return await client.getBookDetail(id);
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
}
