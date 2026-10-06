import { App, TFile, normalizePath, Notice } from 'obsidian';
import type { BookData } from '../api/types';
import type { UpdateMapping } from '../settings';
import { renderTemplate } from '../template/engine';
import { sanitizeFilename } from '../utils/filename';
import { formatDate } from '../utils/date-format';

export interface UpdateNoteOptions {
	mappings: UpdateMapping[];
	bookorbitIdKey: string;
	dateFormat: string;
	filenameTemplate: string;
	outputFolder: string;
}

/**
 * Returns the value appropriate for writing into frontmatter for the given
 * template variable. Arrays stay as arrays (Obsidian writes them as YAML
 * lists), date fields are formatted with moment, everything else is the raw
 * value or null.
 */
function getFrontmatterValue(
	templateVar: string,
	bookData: BookData,
	dateFormat: string,
): unknown {
	const value = bookData[templateVar];

	if (value === undefined || value === null || value === '') {
		return null;
	}

	// Date fields — mirror the same detection logic as the template engine
	if (
		templateVar.endsWith('Date') ||
		templateVar.endsWith('At') ||
		templateVar === 'startDate' ||
		templateVar === 'endDate'
	) {
		if (typeof value === 'string') {
			const formatted = formatDate(value, dateFormat);
			return formatted !== '' ? formatted : null;
		}
	}

	// Arrays stay as arrays so Obsidian writes proper YAML lists
	if (Array.isArray(value)) {
		return (value as unknown[]).length > 0 ? value : null;
	}

	return value;
}

/**
 * Extracts template variable names (without braces) from a template string,
 * e.g. "{{title}} ({{year}})" → ['title', 'year'].
 */
function extractTemplateVars(template: string): string[] {
	return [...template.matchAll(/{{(\w+)(?:\|[^}]+)?}}/g)].map((m) => m[1] as string);
}

/**
 * Updates selected frontmatter properties on `file` from fresh `bookData`
 * according to the user-configured mappings, then renames the file if any
 * variable used in the filename template was updated.
 */
export async function updateBookNote(
	app: App,
	file: TFile,
	bookData: BookData,
	options: UpdateNoteOptions,
): Promise<void> {
	const { mappings, dateFormat, filenameTemplate, outputFolder } = options;

	const enabledMappings = mappings.filter(
		(m) => m.enabled && m.frontmatterKey.trim() !== '',
	);

	if (enabledMappings.length === 0) {
		new Notice('No update fields are enabled. Configure them in plugin settings.');
		return;
	}

	// 1. Batch-update frontmatter in a single write
	await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
		for (const mapping of enabledMappings) {
			fm[mapping.frontmatterKey] = getFrontmatterValue(
				mapping.templateVar,
				bookData,
				dateFormat,
			);
		}
	});

	// 2. Rename the file if the filename template uses any updated variable
	const filenameVars = new Set(extractTemplateVars(filenameTemplate));
	const enabledVars = new Set(enabledMappings.map((m) => m.templateVar));
	const shouldRename = [...filenameVars].some((v) => enabledVars.has(v));

	if (shouldRename) {
		const newBasename = sanitizeFilename(
			renderTemplate(filenameTemplate, bookData, dateFormat),
		);
		const normalizedFolder = normalizePath(outputFolder);
		const newPath = normalizePath(`${normalizedFolder}/${newBasename}.md`);

		if (newPath !== file.path) {
			try {
				await app.fileManager.renameFile(file, newPath);
				new Notice(`Updated and renamed to "${newBasename}"`);
				return;
			} catch (err) {
				new Notice(
					`Note updated but rename failed: ${err instanceof Error ? err.message : String(err)}`,
				);
				return;
			}
		}
	}

	new Notice(`Updated note for "${bookData.title ?? 'book'}"`);
}
