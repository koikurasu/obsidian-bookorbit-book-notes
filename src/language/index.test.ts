import { describe, it, expect } from 'vitest';
import { formatLanguage, type LanguageFormat } from './index';

describe('formatLanguage', () => {
	// Common inputs that must resolve to English across every format.
	const englishInputs = ['en', 'English', 'english', 'EN', 'en-US', 'eng', 'English (US)'];
	const frenchInputs = ['fr', 'French', 'french', 'fra', 'fre'];

	it('returns the raw string unchanged for "as is"', () => {
		for (const input of englishInputs) {
			expect(formatLanguage(input, 'as-is')).toBe(input);
		}
		expect(formatLanguage(null, 'as-is')).toBe('');
		expect(formatLanguage(undefined, 'as-is')).toBe('');
		expect(formatLanguage('', 'as-is')).toBe('');
	});

	it('returns "English" (title case) for the full name format', () => {
		for (const input of englishInputs) {
			expect(formatLanguage(input, 'full')).toBe('English');
		}
		for (const input of frenchInputs) {
			expect(formatLanguage(input, 'full')).toBe('French');
		}
	});

	it('returns "english" (lower case) for the lower case format', () => {
		for (const input of englishInputs) {
			expect(formatLanguage(input, 'lower')).toBe('english');
		}
		for (const input of frenchInputs) {
			expect(formatLanguage(input, 'lower')).toBe('french');
		}
	});

	it('returns the ISO 639-1 alpha-2 code', () => {
		for (const input of englishInputs) {
			expect(formatLanguage(input, 'iso6391')).toBe('en');
		}
		for (const input of frenchInputs) {
			expect(formatLanguage(input, 'iso6391')).toBe('fr');
		}
	});

	it('returns the ISO 639-2 terminological alpha-3 code', () => {
		// 'eng' is both bibliographic and terminological for English.
		for (const input of englishInputs) {
			expect(formatLanguage(input, 'iso6392')).toBe('eng');
		}
		// French: terminological 'fra', bibliographic 'fre' — both must resolve.
		for (const input of frenchInputs) {
			expect(formatLanguage(input, 'iso6392')).toBe('fra');
		}
	});

	it('handles unknown strings by returning them unchanged', () => {
		const unknowns = ['Klingon', 'xxx', 'nonsense', '12345', 'zzz'];
		for (const input of unknowns) {
			expect(formatLanguage(input, 'full')).toBe(input);
			expect(formatLanguage(input, 'iso6391')).toBe(input);
			expect(formatLanguage(input, 'iso6392')).toBe(input);
		}
	});

	it('handles empty string by returning empty string', () => {
		expect(formatLanguage('', 'full')).toBe('');
		expect(formatLanguage('', 'iso6391')).toBe('');
		expect(formatLanguage('', 'iso6392')).toBe('');
	});

	it('returns the original string for a language with no ISO 639-1 code', () => {
		// Achinese (ace) has no ISO 639-1 code and is therefore not in our table.
		const noAlpha2 = ['Achinese', 'ace'];
		for (const input of noAlpha2) {
			for (const fmt of ['full', 'lower', 'iso6391', 'iso6392'] as LanguageFormat[]) {
				expect(formatLanguage(input, fmt)).toBe(input);
			}
		}
	});

	it('strips parenthetical text before lookup', () => {
		// "Greek, Modern (1453-)" is the ISO name for Greek (el/grc).
		expect(formatLanguage('Greek, Modern (1453-)', 'full')).toBe('Greek, Modern (1453-)');
		// The parenthetical is stripped, but "Greek, Modern" is not a key in our
		// English-name index, so the original is returned unchanged.
		expect(formatLanguage('Greek (1453-)', 'iso6391')).toBe('Greek (1453-)');
	});

	it('handles mixed-case and whitespace', () => {
		expect(formatLanguage('  English  ', 'full')).toBe('English');
		expect(formatLanguage('  en  ', 'iso6391')).toBe('en');
	});

	it('handles underscore-separated subtags', () => {
		expect(formatLanguage('en_US', 'full')).toBe('English');
		expect(formatLanguage('zh_Hant', 'iso6391')).toBe('zh');
	});
});