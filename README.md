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
- `{{goodreadsUrl}}` - Goodreads URL
- `{{biblioreadsUrl}}` - Biblioreads URL (an alternative frontend to Goodreads)
- `{{hardcoverUrl}}` - Hardcover URL
- `{{goodreadsRating}}` - Goodreads rating
- `{{hardcoverRating}}` - Hardcover rating
- `{{goodreadsID}}` - Goodreads ID
- `{{hardcoverID}}` - Hardcover ID
- `{{bookorbitUrl}}` - BookOrbit URL
- `{{bookorbitID}}` - BookOrbit book ID
- `{{status}}` - Reading status
- `{{rating}}` - Your rating
- `{{startDate}}` - Start date (formatted)
- `{{endDate}}` - End date (formatted)
- `{{seriesName}}` - Series name
- `{{seriesIndex}}` - Series index

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

## Updating a book note

1. Open a book note that has your configured BookOrbit ID property (default `bookorbitID`) in its frontmatter
2. Press `Ctrl/Cmd + P` and run "Update current book note"
3. The plugin fetches fresh data from BookOrbit and rewrites the enabled frontmatter properties

Configure which properties update in **Settings → BookOrbit → Note updates**: each row maps a
template variable (e.g. `{{title}}`) to a frontmatter key (e.g. `title`) with an on/off checkbox.
If your filename template (e.g. `{{title}} ({{year}})`) uses an updated variable and the rendered
name changed, the file is renamed automatically.

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
