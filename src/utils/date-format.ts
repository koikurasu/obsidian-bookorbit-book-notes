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
	const win =
		typeof window !== 'undefined'
			? (window as unknown as {
					moment?: (d: string) => {
						isValid: () => boolean;
						format: (f: string) => string;
					};
			  })
			: null;
	const moment = win?.moment;

	if (!moment) {
		// Fallback: return the date string as-is for test environment
		return dateString;
	}

	try {
		const m = moment(dateString);
		return m.isValid() ? m.format(format) : dateString;
	} catch {
		return dateString;
	}
}
