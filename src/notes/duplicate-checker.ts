import type { MetadataCache, TFile, Vault } from 'obsidian';

/**
 * Checks if a note with the given bookorbit ID already exists in the output folder.
 * Uses metadataCache for efficient searching.
 */
export function findExistingNoteByBookOrbitId(
	vault: Vault,
	metadataCache: MetadataCache,
	bookorbitId: number,
	outputFolder: string,
): TFile | null {
	const normalizedFolder = outputFolder.replace(/^\/+|\/+$/g, '');
	const files = vault.getMarkdownFiles();

	for (const file of files) {
		// Check if file is in the output folder
		if (normalizedFolder && !file.path.startsWith(normalizedFolder + '/')) {
			continue;
		}

		// Check if file has bookorbitID in frontmatter
		const frontmatter = metadataCache.getFileCache(file)?.frontmatter;
		if (frontmatter && Number(frontmatter['bookorbitID']) === bookorbitId) {
			return file;
		}
	}

	return null;
}
