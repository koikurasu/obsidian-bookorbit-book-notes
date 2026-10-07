/**
 * Escapes a string for safe use in YAML frontmatter.
 * Handles quotes, colons, newlines, and special YAML characters.
 */
export function escapeYamlString(value: string): string {
	if (!value) {
		return '';
	}

	if (value.includes('\n')) {
		return `>\n  ${value.split('\n').join('\n  ')}`;
	}

	if (needsQuoting(value)) {
		return doubleQuote(value);
	}

	return value;
}

/**
 * Escapes a value for use as an item inside a YAML flow sequence (`[...]`).
 * Always double-quotes: inside a flow sequence, commas, brackets, hashes and
 * colons are structural and would otherwise split or break the sequence.
 */
export function escapeYamlFlowItem(value: unknown): string {
	return doubleQuote(String(value));
}

const YAML_INDICATORS = /[#{}[\]|>&*!%@`"]/;
const YAML_KEYWORD = /^(true|false|null|yes|no|on|off|~)$/i;

/**
 * True if the string contains any control character (C0 block or DEL),
 * including newline, carriage return and tab. These cannot appear literally
 * in a YAML plain scalar and must be double-quoted with escapes.
 */
function hasControlChars(value: string): boolean {
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		if (code < 32 || code === 127) {
			return true;
		}
	}
	return false;
}

function needsQuoting(value: string): boolean {
	if (hasControlChars(value)) {
		return true;
	}
	if (YAML_INDICATORS.test(value)) {
		return true;
	}
	if (value.includes(': ') || value.endsWith(':')) {
		return true;
	}
	if (YAML_KEYWORD.test(value)) {
		return true;
	}
	if (value.startsWith('- ') || value === '-' || value.startsWith('? ')) {
		return true;
	}
	if (value.startsWith(' ') || value.endsWith(' ')) {
		return true;
	}
	if (value.startsWith("'")) {
		return true;
	}
	return false;
}

function doubleQuote(value: string): string {
	let escaped = value
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t');

	let out = '';
	for (const char of escaped) {
		const code = char.codePointAt(0) ?? 0;
		if ((code >= 0 && code < 9) || (code > 9 && code < 32) || code === 127) {
			out += '\\u' + code.toString(16).padStart(4, '0');
		} else {
			out += char;
		}
	}

	return '"' + out + '"';
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
