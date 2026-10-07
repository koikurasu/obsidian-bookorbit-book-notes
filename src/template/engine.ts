import type { TemplateVariables } from './types';
import { escapeYamlString, escapeYamlFlowItem, isInFrontmatter } from './yaml-escape';
import { formatDate } from '../utils/date-format';
import { formatLanguage, type LanguageFormat } from '../language';

/**
 * Parses a template and returns the rendered content with variables substituted.
 *
 * The `languageFormat` setting controls how the raw `{{language}}` value from
 * BookOrbit is transformed before substitution. Defaults to 'as-is' so existing
 * notes are unaffected.
 */
export function renderTemplate(
	template: string,
	variables: TemplateVariables,
	dateFormat: string,
	languageFormat: LanguageFormat = 'as-is',
): string {
	const lines = template.split('\n');
	let frontmatterStarted = false;
	let frontmatterEnded = false;

	const renderedLines = lines.map((line) => {
		const { inFrontmatter, started, ended } = isInFrontmatter(
			line,
			frontmatterStarted,
			frontmatterEnded,
		);
		frontmatterStarted = started;
		frontmatterEnded = ended;

		// Check if line should be omitted (empty variable only)
		if (shouldOmitLine(line, variables)) {
			return null;
		}

		// Replace variables
		const rendered = replaceVariables(line, variables, dateFormat, languageFormat, inFrontmatter);

		return rendered;
	});

	// Filter out null lines (omitted)
	return renderedLines.filter((line) => line !== null).join('\n');
}

/**
 * Checks if a line should be omitted because it contains only an empty variable.
 * User decision: keep empty values in frontmatter, don't omit lines.
 */
function shouldOmitLine(_line: string, _variables: TemplateVariables): boolean {
	// User decided to keep empty values in frontmatter
	return false;
}

/**
 * Replaces variables in a line.
 */
function replaceVariables(
	line: string,
	variables: TemplateVariables,
	dateFormat: string,
	languageFormat: LanguageFormat,
	inFrontmatter: boolean,
): string {
	// Match {{variable}} or {{variable|default}}
	return line.replace(/{{(\w+)(?:\|([^}]+))?}}/g, (_match: string, varName: string, defaultValue?: string) => {
		let value: unknown = variables[varName];

		// The {{language}} variable is transformed by the configured format before
		// any other handling. A null/empty raw value stays empty.
		if (varName === 'language' && languageFormat !== 'as-is') {
			const raw = variables[varName];
			const rawStr =
				typeof raw === 'string'
					? raw
					: raw === null || raw === undefined
						? ''
						: String(raw);
			value = formatLanguage(rawStr, languageFormat);
		}

		// Handle missing/empty values
		if (value === null || value === undefined || value === '') {
			if (defaultValue !== undefined) {
				return inFrontmatter ? escapeYamlString(defaultValue) : defaultValue;
			}
			return '';
		}

		// Handle dates
		if (
			varName.endsWith('Date') ||
			varName.endsWith('At') ||
			varName === 'startDate' ||
			varName === 'endDate'
		) {
			if (typeof value === 'string') {
				const formatted = formatDate(value, dateFormat);
				// Dates must still be escaped in frontmatter: ISO timestamps
				// contain colons which YAML could misparse as mappings.
				return inFrontmatter ? escapeYamlString(formatted) : formatted;
			}
		}

		// Handle arrays
		if (Array.isArray(value)) {
			if (varName.endsWith('Array')) {
				if (value.length === 0) {
					return '[]';
				}
				// YAML inline list format. Inside frontmatter every item must be
				// quoted: commas, brackets, hashes and colons are structural in a
				// flow sequence and would otherwise split or break the list.
				if (inFrontmatter) {
					return `[${value.map((v) => escapeYamlFlowItem(v)).join(', ')}]`;
				}
				return `[${value.map((v) => String(v)).join(', ')}]`;
			}
			// Comma-separated string
			const joined = value.map((v) => String(v)).join(', ');
			return inFrontmatter ? escapeYamlString(joined) : joined;
		}

		// Handle numbers
		if (typeof value === 'number') {
			return String(value);
		}

		// Handle strings
		if (typeof value === 'string') {
			if (inFrontmatter) {
				return escapeYamlString(value);
			}
			return value;
		}

		if (typeof value === 'boolean') {
			return String(value);
		}

		return '';
	});
}

/**
 * Built-in default template.
 */
export const DEFAULT_TEMPLATE = `---
title: {{title}}
subtitle: {{subtitle}}
author: {{authorsArray}}
year: {{year}}
releaseDate: {{releaseDate}}
isbn: {{isbn}}
publisher: {{publisher}}
language: {{language}}
pages: {{pages}}
genres: {{genresArray}}
plot: {{plot}}
image: {{cover}}
goodreadsUrl: {{goodreadsUrl}}
biblioreadsUrl: {{biblioreadsUrl}}
hardcoverUrl: {{hardcoverUrl}}
bookorbitUrl: {{bookorbitUrl}}
bookorbitID: {{bookorbitID}}
category: literature
format: book
dataSource: BookOrbit
status: {{status}}
rating: {{rating}}
startDate: {{startDate}}
endDate: {{endDate}}
created:
updated:
---

## review

---

[[books.base|Books]]
`;
