import { normalizePath, TFile, Notice, App } from 'obsidian';
import type { BookData } from '../api/types';
import type { LanguageFormat } from '../language';
import { renderTemplate } from '../template/engine';
import { sanitizeFilename, resolveFilename } from '../utils/filename';
import { findExistingNoteByBookOrbitId } from './duplicate-checker';

export interface NoteCreationOptions {
	outputFolder: string;
	filenameTemplate: string;
	template: string;
	dateFormat: string;
	languageFormat: LanguageFormat;
	downloadCovers: boolean;
	coverFolder: string;
	openNoteAfterCreation: boolean;
	bookorbitUrl: string;
}

export async function createBookNote(
	app: App,
	bookData: BookData,
	options: NoteCreationOptions,
	downloadCoverFn: (id: number) => Promise<{ data: ArrayBuffer; contentType: string } | null>,
): Promise<TFile | null> {
	const vault = app.vault;
	const metadataCache = app.metadataCache;

	// Check for duplicate
	const existingNote = findExistingNoteByBookOrbitId(
		vault,
		metadataCache,
		bookData.bookorbitID,
		options.outputFolder,
	);

	if (existingNote) {
		new Notice('A note for this book already exists.');
		return existingNote;
	}

	// Create output folder if missing
	const normalizedOutputFolder = normalizePath(options.outputFolder);
	const folder = vault.getAbstractFileByPath(normalizedOutputFolder);
	if (!folder) {
		await vault.createFolder(normalizedOutputFolder);
	}

	// Download cover if enabled
	if (options.downloadCovers) {
		const coverData = await downloadCoverFn(bookData.bookorbitID);
		if (coverData) {
			const normalizedCoverFolder = normalizePath(options.coverFolder);
			const coverFolder = vault.getAbstractFileByPath(normalizedCoverFolder);
			if (!coverFolder) {
				await vault.createFolder(normalizedCoverFolder);
			}

			const coverFilename = sanitizeFilename(`${bookData.title || 'cover'}.jpg`);
			const coverPath = normalizePath(`${normalizedCoverFolder}/${coverFilename}`);
			const existingCover = vault.getAbstractFileByPath(coverPath);
			if (existingCover instanceof TFile) {
				await vault.modifyBinary(existingCover, coverData.data);
			} else {
				await vault.createBinary(coverPath, coverData.data);
			}
			bookData.cover = coverPath;
			bookData.image = coverPath;
		}
	}

	// Render template
	const renderedContent = renderTemplate(
		options.template,
		bookData,
		options.dateFormat,
		options.languageFormat,
	);

	// Generate filename
	const baseFilename = sanitizeFilename(
		renderTemplate(
			options.filenameTemplate,
			bookData,
			options.dateFormat,
			options.languageFormat,
		),
	);

	// Resolve filename with collision handling
	const existsFn = (filename: string) => {
		const path = normalizePath(`${normalizedOutputFolder}/${filename}.md`);
		return vault.getAbstractFileByPath(path) !== null;
	};

	const resolvedFilename = resolveFilename(
		baseFilename,
		bookData.author,
		bookData.bookorbitID,
		existsFn,
	);

	const filePath = normalizePath(`${normalizedOutputFolder}/${resolvedFilename}.md`);

	// Create note
	const createdFile = await vault.create(filePath, renderedContent);

	// Open note if setting enabled
	if (options.openNoteAfterCreation) {
		const leaf = app.workspace.getLeaf(false);
		if (leaf) {
			await leaf.openFile(createdFile, { state: { mode: 'source' } });
		}
	}

	new Notice(`Created note for ${bookData.title || 'book'}`);

	return createdFile;
}
