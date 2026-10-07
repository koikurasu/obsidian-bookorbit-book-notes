import { PluginSettingTab, Setting, SecretComponent, Notice } from 'obsidian';
import type BookOrbitPlugin from './main';
import { FileSuggest, FolderSuggest } from './ui';

export interface UpdateMapping {
	templateVar: string;
	frontmatterKey: string;
	enabled: boolean;
}

export const DEFAULT_UPDATE_MAPPINGS: UpdateMapping[] = [
	{ templateVar: 'title', frontmatterKey: 'title', enabled: true },
	{ templateVar: 'subtitle', frontmatterKey: 'subtitle', enabled: true },
	{ templateVar: 'authorsArray', frontmatterKey: 'author', enabled: true },
	{ templateVar: 'publishedYear', frontmatterKey: 'year', enabled: true },
	{ templateVar: 'publishedDate', frontmatterKey: 'releaseDate', enabled: false },
	{ templateVar: 'isbn13', frontmatterKey: 'isbn', enabled: false },
	{ templateVar: 'isbn10', frontmatterKey: 'isbn10', enabled: false },
	{ templateVar: 'publisher', frontmatterKey: 'publisher', enabled: false },
	{ templateVar: 'language', frontmatterKey: 'language', enabled: false },
	{ templateVar: 'pageCount', frontmatterKey: 'pages', enabled: true },
	{ templateVar: 'genresArray', frontmatterKey: 'genres', enabled: true },
	{ templateVar: 'description', frontmatterKey: 'plot', enabled: false },
	{ templateVar: 'cover', frontmatterKey: 'image', enabled: false },
	{ templateVar: 'status', frontmatterKey: 'status', enabled: true },
	{ templateVar: 'rating', frontmatterKey: 'rating', enabled: false },
	{ templateVar: 'startedAt', frontmatterKey: 'startDate', enabled: true },
	{ templateVar: 'finishedAt', frontmatterKey: 'endDate', enabled: true },
	{ templateVar: 'goodreadsRating', frontmatterKey: 'goodreadsRating', enabled: false },
	{ templateVar: 'hardcoverRating', frontmatterKey: 'hardcoverRating', enabled: false },
	{ templateVar: 'goodreadsId', frontmatterKey: 'goodreadsID', enabled: false },
	{ templateVar: 'hardcoverId', frontmatterKey: 'hardcoverID', enabled: false },
	{ templateVar: 'biblioreadsUrl', frontmatterKey: 'biblioreadsUrl', enabled: false },
	{ templateVar: 'hardcoverUrl', frontmatterKey: 'hardcoverUrl', enabled: false },
	{ templateVar: 'bookorbitUrl', frontmatterKey: 'bookorbitUrl', enabled: false },
	{ templateVar: 'seriesName', frontmatterKey: 'seriesName', enabled: false },
	{ templateVar: 'seriesIndex', frontmatterKey: 'seriesIndex', enabled: false },
];

export interface BookOrbitSettings {
	serverUrl: string;
	username: string;
	passwordSecret: string;
	password?: string;
	outputFolder: string;
	filenameTemplate: string;
	openNoteAfterCreation: boolean;
	templatePath: string;
	dateFormat: string;
	downloadCovers: boolean;
	coverFolder: string;
	maxSearchResults: number;
	statusMap: Record<string, string>;
	bookorbitIdKey: string;
	updateMappings: UpdateMapping[];
}

export const DEFAULT_SETTINGS: BookOrbitSettings = {
	serverUrl: '',
	username: '',
	passwordSecret: '',
	password: '',
	outputFolder: 'books',
	filenameTemplate: '{{title}}',
	openNoteAfterCreation: true,
	templatePath: 'templates/book note template.md',
	dateFormat: 'YYYY-MM-DD',
	downloadCovers: true,
	coverFolder: 'books/covers',
	maxSearchResults: 10,
	bookorbitIdKey: 'bookorbitID',
	updateMappings: DEFAULT_UPDATE_MAPPINGS,
	statusMap: {
		unread: 'unread',
		want_to_read: 'not started',
		reading: 'started',
		on_hold: 'paused',
		rereading: 'rereading',
		read: 'done',
		skimmed: 'skimmed',
		abandoned: 'did not finish',
	},
};

export class BookOrbitSettingTab extends PluginSettingTab {
	plugin: BookOrbitPlugin;

	constructor(plugin: BookOrbitPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Connection section
		new Setting(containerEl)
			.setName('Connection')
			.setHeading();

		new Setting(containerEl)
			.setName('Server URL')
			.setDesc('The full URL of your BookOrbit instance.')
			.addText((text) =>
				text
					.setPlaceholder('https://bookorbit.yourdomain.com')
					.setValue(this.plugin.settings.serverUrl)
					.onChange(async (value) => {
						this.plugin.settings.serverUrl = value.trim().replace(/\/$/, '');
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Username')
			.addText((text) =>
				text
					.setPlaceholder('Your username')
					.setValue(this.plugin.settings.username)
					.onChange(async (value) => {
						this.plugin.settings.username = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		if (this.app.secretStorage) {
			new Setting(containerEl)
				.setName('Password secret')
				.setDesc('Select or create a secret for your BookOrbit password.')
				.addComponent((el) =>
					new SecretComponent(this.app, el)
						.setValue(this.plugin.settings.passwordSecret)
						.onChange(async (value) => {
							this.plugin.settings.passwordSecret = value;
							await this.plugin.saveSettings();
						}),
				);
		} else {
			new Setting(containerEl)
				.setName('Password')
				.addText((text) => {
					text
						.setPlaceholder('Your password')
						.setValue(this.plugin.settings.password || '')
						.onChange(async (value) => {
							this.plugin.settings.password = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.type = 'password';
				});
		}

		new Setting(containerEl)
			.addButton((button) => {
				button.setButtonText('Test connection');
				button.onClick(async () => {
					button.setDisabled(true);
					button.setButtonText('Testing...');

					const success = await this.plugin.testConnection();

					if (success) {
						new Notice('Connection successful!');
					} else {
						new Notice('Connection failed. Check your credentials.');
					}

					button.setDisabled(false);
					button.setButtonText('Test connection');
				});
			});

		// Output section
		new Setting(containerEl)
			.setName('Output')
			.setHeading();

		new Setting(containerEl)
			.setName('Destination folder')
			.setDesc('Folder in your vault where book notes will be saved.')
			.addSearch((search) => {
				new FolderSuggest(this.app, search.inputEl);
				search
					.setPlaceholder('Books')
					.setValue(this.plugin.settings.outputFolder)
					.onChange(async (value) => {
						this.plugin.settings.outputFolder = value.trim().replace(/\.\./g, '').replace(/^\/+|\/+$/g, '') || 'books';
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Filename template')
			.setDesc('Template for note filenames. Use {{title}}, {{year}}, etc.')
			.addText((text) =>
				text
					.setPlaceholder('{{title}}')
					.setValue(this.plugin.settings.filenameTemplate)
					.onChange(async (value) => {
						this.plugin.settings.filenameTemplate = value.trim() || '{{title}}';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Open note after creation')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openNoteAfterCreation)
					.onChange(async (value) => {
						this.plugin.settings.openNoteAfterCreation = value;
						await this.plugin.saveSettings();
					}),
			);

		// Template section
		new Setting(containerEl)
			.setName('Template')
			.setHeading();

		new Setting(containerEl)
			.setName('Template file path')
			.setDesc('Path to a note in your vault to use as template.')
			.addSearch((search) => {
				new FileSuggest(this.app, search.inputEl);
				search
					.setPlaceholder('templates/book note template.md')
					.setValue(this.plugin.settings.templatePath)
					.onChange(async (value) => {
						this.plugin.settings.templatePath = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Date format')
			.setDesc('Moment.js format string for dates.')
			.addText((text) =>
				text
					.setPlaceholder('YYYY-MM-DD')
					.setValue(this.plugin.settings.dateFormat)
					.onChange(async (value) => {
						this.plugin.settings.dateFormat = value.trim() || 'YYYY-MM-DD';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.addButton((button) => {
				button.setButtonText('Reset to default template');
				button.onClick(async () => {
					this.plugin.settings.templatePath = '';
					await this.plugin.saveSettings();
					new Notice('Template reset to default.');
					this.display();
				});
			});

		// Covers section
		new Setting(containerEl)
			.setName('Covers')
			.setHeading();

		new Setting(containerEl)
			.setName('Download covers to vault')
			.setDesc('Download cover images to your vault.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.downloadCovers)
					.onChange(async (value) => {
						this.plugin.settings.downloadCovers = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (this.plugin.settings.downloadCovers) {
			new Setting(containerEl)
				.setName('Cover folder')
				.setDesc('Folder where cover images will be saved.')
				.addSearch((search) => {
					new FolderSuggest(this.app, search.inputEl);
					search
						.setPlaceholder('Books/covers')
						.setValue(this.plugin.settings.coverFolder)
						.onChange(async (value) => {
							this.plugin.settings.coverFolder = value.trim().replace(/\.\./g, '').replace(/^\/+|\/+$/g, '') || 'books/covers';
							await this.plugin.saveSettings();
						});
				});
		}

		// Search section
		new Setting(containerEl)
			.setName('Search')
			.setHeading();

		new Setting(containerEl)
			.setName('Max search results')
			.setDesc('Maximum number of results to show in search.')
			.addSlider((slider) =>
				slider
					.setLimits(1, 20, 1)
					.setValue(this.plugin.settings.maxSearchResults)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxSearchResults = value;
						await this.plugin.saveSettings();
					}),
			);

		// Status mapping section
		new Setting(containerEl)
			.setName('Status mapping')
			.setHeading();

		new Setting(containerEl)
			.setDesc(
				'Map BookOrbit status values to your preferred labels. ' +
				'These appear in the {{status}} template variable.',
			);

		const STATUS_KEYS: { key: string; label: string }[] = [
			{ key: 'unread', label: 'Unread' },
			{ key: 'want_to_read', label: 'Want to read' },
			{ key: 'reading', label: 'Reading' },
			{ key: 'on_hold', label: 'On hold' },
			{ key: 'rereading', label: 'Rereading' },
			{ key: 'read', label: 'Read' },
			{ key: 'skimmed', label: 'Skimmed' },
			{ key: 'abandoned', label: 'Abandoned' },
		];

		for (const { key, label } of STATUS_KEYS) {
			new Setting(containerEl)
				.setName(label)
				.setDesc(`API value: "${key}"`)
				.addText((text) =>
					text
						.setValue(this.plugin.settings.statusMap[key] ?? key)
						.onChange(async (value) => {
							this.plugin.settings.statusMap[key] = value.trim() || key;
							await this.plugin.saveSettings();
						}),
				);
		}

		// Note updates section
		new Setting(containerEl)
			.setName('Note updates')
			.setHeading();

		new Setting(containerEl)
			.setName('BookOrbit ID property')
			.setDesc('Frontmatter key used to identify a book note (used by "update current book note").')
			.addText((text) =>
				text
					.setPlaceholder('bookorbitID')
					.setValue(this.plugin.settings.bookorbitIdKey)
					.onChange(async (value) => {
						this.plugin.settings.bookorbitIdKey = value.trim() || 'bookorbitID';
						await this.plugin.saveSettings();
					}),
			);

		const updateDesc = containerEl.createEl('p', { cls: 'bookorbit-update-desc' });
		updateDesc.setText(
			'Choose which properties to refresh when updating a note. ' +
			'Set the frontmatter key to match your template and tick the box to enable.',
		);

		const table = containerEl.createEl('table', { cls: 'bookorbit-update-table' });

		// Header row
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		const headers = ['Template variable', 'Frontmatter key', 'Update'];
		for (const h of headers) {
			const th = headerRow.createEl('th');
			th.setText(h);
			if (h === 'Update') th.addClass('bookorbit-update-check-col');
		}

		// Body rows
		const tbody = table.createEl('tbody');
		for (let i = 0; i < this.plugin.settings.updateMappings.length; i++) {
			const mapping = this.plugin.settings.updateMappings[i];
			if (!mapping) continue;

			const row = tbody.createEl('tr');

			// Template variable cell
			const varTd = row.createEl('td', { cls: 'bookorbit-update-var' });
			varTd.setText('{{' + mapping.templateVar + '}}');

			// Frontmatter key cell
			const keyTd = row.createEl('td', { cls: 'bookorbit-update-key' });

			const keyInput = keyTd.createEl('input');
			keyInput.type = 'text';
			keyInput.value = mapping.frontmatterKey;
			keyInput.addClass('setting-item-input');

			const idx = i;
			keyInput.addEventListener('change', () => {
				const m = this.plugin.settings.updateMappings[idx];
				if (m) {
					m.frontmatterKey = keyInput.value.trim() || m.templateVar;
					void this.plugin.saveSettings();
				}
			});

			// Enabled checkbox cell
			const checkTd = row.createEl('td', { cls: 'bookorbit-update-check' });

			const checkbox = checkTd.createEl('input');
			checkbox.type = 'checkbox';
			checkbox.checked = mapping.enabled;
			checkbox.addEventListener('change', () => {
				const m = this.plugin.settings.updateMappings[idx];
				if (m) {
					m.enabled = checkbox.checked;
					void this.plugin.saveSettings();
				}
			});
		}
	}
}
