/**
 * Sanitizes a filename by replacing illegal characters with a safe substitute.
 */
export function sanitizeFilename(filename: string): string {
	return filename
		.replace(/[\\/:*?"<>|]/g, '-')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Resolves a filename with collision handling.
 * If the base filename exists, appends author, then bookorbit ID.
 */
export function resolveFilename(
	baseFilename: string,
	author: string,
	bookorbitId: number,
	existsFn: (filename: string) => boolean,
): string {
	let resolved = baseFilename;

	if (!existsFn(resolved)) {
		return resolved;
	}

	// Try with author
	const withAuthor = `${baseFilename} - ${author}`;
	if (!existsFn(withAuthor)) {
		return withAuthor;
	}

	// Try with bookorbit ID
	const withId = `${baseFilename} (${bookorbitId})`;
	if (!existsFn(withId)) {
		return withId;
	}

	// Try with both
	const withBoth = `${baseFilename} - ${author} (${bookorbitId})`;
	if (!existsFn(withBoth)) {
		return withBoth;
	}

	// Last resort: append timestamp
	const withTimestamp = `${baseFilename} (${bookorbitId})-${Date.now()}`;
	return withTimestamp;
}
