export interface TemplateVariables {
	title: string | null;
	subtitle: string | null;
	author: string;
	authorsArray: string[];
	year: number | null;
	releaseDate: string | null;
	isbn: string | null;
	publisher: string | null;
	language: string | null;
	pages: number | null;
	genres: string;
	genresArray: string[];
	plot: string | null;
	cover: string | null;
	biblioreadsUrl: string | null;
	hardcoverUrl: string | null;
	bookorbitUrl: string;
	bookorbitID: number;
	status: string;
	rating: number | null;
	startDate: string | null;
	endDate: string | null;
	seriesName: string | null;
	seriesIndex: string | null;
	goodreadsRating: number | null;
	hardcoverRating: number | null;
	goodreadsID: string | null;
	hardcoverID: string | null;
	[key: string]: unknown; // Allow for additional variables
}
