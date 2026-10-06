# BookOrbit Plugin for Obsidian

Search your BookOrbit instance and create book notes from a configurable template.

## Installation

1. Download the latest release from [GitHub Releases](https://github.com/yourusername/obsidian-bookorbit/releases)
2. Extract the files to your vault's `.obsidian/plugins/obsidian-bookorbit/` folder
3. Enable the plugin in **Settings → Community plugins**

## Configuration

1. Open **Settings → BookOrbit**
2. Enter your BookOrbit server URL
3. Enter your username and password (stored securely)
4. Click "Test connection" to verify
5. Configure output folder, template, and other settings

## Template Variables

The following variables are available in your note template:

- `{{title}}` - Book title
- `{{subtitle}}` - Book subtitle
- `{{author}}` - Authors (comma-separated)
- `{{authorsArray}}` - Authors (YAML list)
- `{{year}}` - Publication year
- `{{releaseDate}}` - Publication date (formatted)
- `{{isbn}}` - ISBN-13
- `{{publisher}}` - Publisher
- `{{language}}` - Language
- `{{pages}}` - Page count
- `{{genres}}` - Genres (comma-separated)
- `{{genresArray}}` - Genres (YAML list)
- `{{plot}}` - Description/plot
- `{{cover}}` - Cover image path
- `{{biblioreadsUrl}}` - Biblioreads URL
- `{{hardcoverUrl}}` - Hardcover URL
- `{{bookorbitUrl}}` - BookOrbit URL
- `{{bookorbitID}}` - BookOrbit book ID
- `{{status}}` - Reading status
- `{{rating}}` - Your rating
- `{{startDate}}` - Start date (formatted)
- `{{endDate}}` - End date (formatted)
- `{{seriesName}}` - Series name
- `{{seriesIndex}}` - Series index
- `{{goodreadsRating}}` - Goodreads rating
- `{{hardcoverRating}}` - Hardcover rating
- `{{goodreadsID}}` - Goodreads ID
- `{{hardcoverID}}` - Hardcover ID

### Template Syntax

- Use `{{variable}}` to insert a value
- Use `{{variable|default}}` to provide a fallback value
- Variables ending in `Array` render as YAML inline lists
- Empty values are kept in frontmatter (as empty strings)
- Date variables are formatted using moment.js format string

## Usage

1. Press `Ctrl/Cmd + P` to open the command palette
2. Search for "Search BookOrbit"
3. Type your search query
4. Select a book from the results
5. The plugin will create a note using your template

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
```

## License

MIT
