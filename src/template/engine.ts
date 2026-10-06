import type { TemplateVariables } from './types';
import { escapeYamlString, isInFrontmatter } from './yaml-escape';
import { formatDate } from '../utils/date-format';

/**
 * Parses a template and returns the rendered content with variables substituted.
 */
export function renderTemplate(
	template: string,
	variables: TemplateVariables,
	dateFormat: string,
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
		const rendered = replaceVariables(line, variables, dateFormat, inFrontmatter);

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
	inFrontmatter: boolean,
): string {
	// Match {{variable}} or {{variable|default}}
	return line.replace(/{{(\w+)(?:\|([^}]+))?}}/g, (_match: string, varName: string, defaultValue?: string) => {
		const value: unknown = variables[varName];

		// Handle missing/empty values
		if (value === null || value === undefined || value === '') {
			if (defaultValue !== undefined) {
				return defaultValue;
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
				return formatDate(value, dateFormat);
			}
		}

		// Handle arrays
		if (Array.isArray(value)) {
			if (varName.endsWith('Array')) {
				// YAML inline list format
				return `[${value.map((v) => String(v)).join(', ')}]`;
			}
			// Comma-separated string
			return value.map((v) => String(v)).join(', ');
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
