import { PluginSettingTab, Setting, SecretComponent, Notice } from 'obsidian';
import type BookOrbitPlugin from './main';

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
			.addText((text) =>
				text
					.setPlaceholder('Books')
					.setValue(this.plugin.settings.outputFolder)
					.onChange(async (value) => {
						this.plugin.settings.outputFolder = value.trim().replace(/\.\./g, '').replace(/^\/+|\/+$/g, '') || 'books';
						await this.plugin.saveSettings();
					}),
			);

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
			.addText((text) =>
				text
					.setPlaceholder('templates/book note template.md')
					.setValue(this.plugin.settings.templatePath)
					.onChange(async (value) => {
						this.plugin.settings.templatePath = value.trim();
						await this.plugin.saveSettings();
					}),
			);

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
				.addText((text) =>
					text
						.setPlaceholder('Books/covers')
						.setValue(this.plugin.settings.coverFolder)
						.onChange(async (value) => {
							this.plugin.settings.coverFolder = value.trim().replace(/\.\./g, '').replace(/^\/+|\/+$/g, '') || 'books/covers';
							await this.plugin.saveSettings();
						}),
				);
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
	}
}
