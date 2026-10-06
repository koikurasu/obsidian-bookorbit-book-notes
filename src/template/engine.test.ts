import { describe, it, expect } from 'vitest';
import { renderTemplate, DEFAULT_TEMPLATE } from './engine';
import type { TemplateVariables } from './types';

describe('Template Engine', () => {
	const mockVariables: TemplateVariables = {
		title: 'Test Book',
		subtitle: 'A Subtitle',
		author: 'Author One, Author Two',
		authorsArray: ['Author One', 'Author Two'],
		year: 2024,
		releaseDate: '2024-01-15',
		isbn: '9781234567890',
		publisher: 'Test Publisher',
		language: 'English',
		pages: 300,
		genres: 'Fiction, Mystery',
		genresArray: ['Fiction', 'Mystery'],
		plot: 'A great story',
		cover: 'covers/test-book.jpg',
		biblioreadsUrl: 'https://biblioreads.eu.org/book/show/12345',
		hardcoverUrl: 'https://hardcover.app/books/test-book',
		bookorbitUrl: 'http://localhost:6262/book/8',
		bookorbitID: 8,
		status: 'Reading',
		rating: 4,
		startDate: '2024-01-01T00:00:00.000Z',
		endDate: null,
		seriesName: 'Test Series',
		seriesIndex: '1',
		goodreadsRating: 4.5,
		hardcoverRating: 4.2,
		goodreadsID: '12345',
		hardcoverID: 'test-book',
	};

	it('should replace simple variables', () => {
		const template = 'Title: {{title}}';
		const result = renderTemplate(template, mockVariables, 'YYYY-MM-DD');
		expect(result).toBe('Title: Test Book');
	});

	it('should handle null values', () => {
		const template = 'Subtitle: {{subtitle}}';
		const result = renderTemplate(template, { ...mockVariables, subtitle: null }, 'YYYY-MM-DD');
		expect(result).toBe('Subtitle: ');
	});

	it('should handle fallback values', () => {
		const template = 'Subtitle: {{subtitle|No subtitle}}';
		const result = renderTemplate(template, { ...mockVariables, subtitle: null }, 'YYYY-MM-DD');
		expect(result).toBe('Subtitle: No subtitle');
	});

	it('should render arrays as comma-separated strings', () => {
		const template = 'Authors: {{author}}';
		const result = renderTemplate(template, mockVariables, 'YYYY-MM-DD');
		expect(result).toBe('Authors: Author One, Author Two');
	});

	it('should render array variables as YAML lists', () => {
		const template = 'Authors: {{authorsArray}}';
		const result = renderTemplate(template, mockVariables, 'YYYY-MM-DD');
		expect(result).toBe('Authors: [Author One, Author Two]');
	});

	it('should escape YAML strings in frontmatter', () => {
		const template = `---
title: {{title}}
plot: {{plot}}
---`;
		const result = renderTemplate(template, mockVariables, 'YYYY-MM-DD');
		expect(result).toContain('title: Test Book');
		expect(result).toContain('plot: A great story');
	});

	it('should escape strings with colons in frontmatter', () => {
		const template = `---
subtitle: {{subtitle}}
---`;
		const result = renderTemplate(template, { ...mockVariables, subtitle: 'Test: Subtitle' }, 'YYYY-MM-DD');
		expect(result).toContain('"Test: Subtitle"');
	});

	it('should escape strings with quotes in frontmatter', () => {
		const template = `---
title: {{title}}
---`;
		const result = renderTemplate(template, { ...mockVariables, title: 'Test "Book"' }, 'YYYY-MM-DD');
		// Quotes are escaped with backslash and wrapped in double quotes
		expect(result).toContain('title: "Test \\"Book\\""');
	});

	it('should handle multi-line strings in frontmatter', () => {
		const template = `---
plot: {{plot}}
---`;
		const result = renderTemplate(template, { ...mockVariables, plot: 'Line 1\nLine 2\nLine 3' }, 'YYYY-MM-DD');
		expect(result).toContain('>\n  Line 1\n  Line 2\n  Line 3');
	});

	it('should not escape strings outside frontmatter', () => {
		const template = `# {{title}}

{{plot}}`;
		const result = renderTemplate(template, mockVariables, 'YYYY-MM-DD');
		expect(result).toContain('# Test Book');
		expect(result).toContain('A great story');
		expect(result).not.toContain('"');
	});

	it('should keep empty values in frontmatter', () => {
		const template = `---
title: {{title}}
subtitle: {{subtitle}}
isbn: {{isbn}}
---`;
		const result = renderTemplate(template, { ...mockVariables, subtitle: null, isbn: null }, 'YYYY-MM-DD');
		expect(result).toContain('title: Test Book');
		expect(result).toContain('subtitle: ');
		expect(result).toContain('isbn: ');
	});

	it('should keep URL lines with empty IDs (as per user decision)', () => {
		const template = `---
biblioreadsUrl: {{biblioreadsUrl}}
hardcoverUrl: {{hardcoverUrl}}
---`;
		const result = renderTemplate(template, { ...mockVariables, biblioreadsUrl: null, hardcoverUrl: null }, 'YYYY-MM-DD');
		// User decided to keep lines even with empty values
		expect(result).toContain('biblioreadsUrl: ');
		expect(result).toContain('hardcoverUrl: ');
	});

	it('should handle the example template with complex description', () => {
		const complexVariables: TemplateVariables = {
			...mockVariables,
			plot: 'The world\'s turned into a lawless free-for-all: you\'re worried about driving without a licence? An asteroid is hurtling towards Earth and the human race has just over two months to live.',
			biblioreadsUrl: null, // Missing goodreads ID
		};

		const result = renderTemplate(DEFAULT_TEMPLATE, complexVariables, 'YYYY-MM-DD');

		// Check that description is properly escaped
		expect(result).toContain('plot:');
		expect(result).toContain('lawless free-for-all');

		// Check that biblioreadsUrl line is kept (with empty value, per user decision)
		expect(result).toContain('biblioreadsUrl: ');
	});

	it('should handle empty arrays', () => {
		const template = `---
genres: {{genresArray}}
---`;
		const result = renderTemplate(template, { ...mockVariables, genresArray: [] }, 'YYYY-MM-DD');
		expect(result).toContain('genres: []');
	});

	it('should handle number values', () => {
		const template = `---
year: {{year}}
rating: {{rating}}
---`;
		const result = renderTemplate(template, mockVariables, 'YYYY-MM-DD');
		expect(result).toContain('year: 2024');
		expect(result).toContain('rating: 4');
	});
});
