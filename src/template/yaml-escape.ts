/**
 * Escapes a string for safe use in YAML frontmatter.
 * Handles quotes, colons, newlines, and special YAML characters.
 */
export function escapeYamlString(value: string): string {
	if (!value) {
		return '';
	}

	// If the string contains newlines, use a YAML block scalar
	if (value.includes('\n')) {
		// Use folded block scalar (>) for multi-line strings
		return `>\n  ${value.split('\n').join('\n  ')}`;
	}

	// Check if the string needs quoting
	const needsQuoting =
		value.includes(':') ||
		value.includes('#') ||
		value.includes('[') ||
		value.includes(']') ||
		value.includes('{') ||
		value.includes('}') ||
		value.includes('|') ||
		value.includes('>') ||
		value.includes('*') ||
		value.includes('&') ||
		value.includes('!') ||
		value.includes('%') ||
		value.includes('@') ||
		value.includes('`') ||
		value.includes('"') ||
		value.startsWith(' ') ||
		value.endsWith(' ') ||
		value.startsWith("'");

	if (needsQuoting) {
		// Use double quotes and escape special characters
		return `"${value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
	}

	return value;
}

/**
 * Detects if a line is within YAML frontmatter.
 * Frontmatter is between the first and second `---` markers.
 */
export function isInFrontmatter(
	line: string,
	frontmatterStarted: boolean,
	frontmatterEnded: boolean,
): { inFrontmatter: boolean; started: boolean; ended: boolean } {
	if (!frontmatterStarted && line.trim() === '---') {
		return { inFrontmatter: true, started: true, ended: false };
	}

	if (frontmatterStarted && !frontmatterEnded && line.trim() === '---') {
		return { inFrontmatter: false, started: true, ended: true };
	}

	return {
		inFrontmatter: frontmatterStarted && !frontmatterEnded,
		started: frontmatterStarted,
		ended: frontmatterEnded,
	};
}
