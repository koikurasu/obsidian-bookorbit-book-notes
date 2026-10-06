/**
 * Formats a date string using moment.js (available in Obsidian).
 * @param dateString - ISO date string or null
 * @param format - Moment.js format string
 * @returns Formatted date string or empty string if null
 */
export function formatDate(dateString: string | null, format: string): string {
	if (!dateString) {
		return '';
	}

	// Use moment from global scope (available in Obsidian)
	// @ts-ignore - moment is available globally in Obsidian
	const moment = typeof window !== 'undefined' ? window.moment : null;

	if (!moment) {
		// Fallback: return the date string as-is for test environment
		return dateString;
	}

	return moment(dateString).format(format);
}
