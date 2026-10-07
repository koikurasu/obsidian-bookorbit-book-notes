import { AbstractInputSuggest, TFile, TFolder } from 'obsidian';
import type { App } from 'obsidian';

/**
 * Suggests markdown files from the vault as the user types.
 * Used for the template file setting. Mirrors the approach used by
 * obsidian-book-search-plugin and obsidian-media-db-plugin.
 */
export class FileSuggest extends AbstractInputSuggest<TFile> {
	constructor(
		app: App,
		private readonly inputEl: HTMLInputElement,
	) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): TFile[] {
		const lower = query.toLowerCase();
		return this.app.vault
			.getAllLoadedFiles()
			.filter(
				(f): f is TFile =>
					f instanceof TFile &&
					f.extension === 'md' &&
					f.path.toLowerCase().includes(lower),
			);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile): void {
		this.inputEl.value = file.path;
		this.inputEl.trigger('input');
		this.close();
	}
}

/**
 * Suggests folders from the vault as the user types.
 * Used for the destination folder setting.
 */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(
		app: App,
		private readonly inputEl: HTMLInputElement,
	) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): TFolder[] {
		const lower = query.toLowerCase();
		return this.app.vault
			.getAllLoadedFiles()
			.filter(
				(f): f is TFolder =>
					f instanceof TFolder && f.path.toLowerCase().includes(lower),
			);
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	selectSuggestion(folder: TFolder): void {
		this.inputEl.value = folder.path;
		this.inputEl.trigger('input');
		this.close();
	}
}
