# BookOrbit Book Notes Plugin for Obsidian

Search your BookOrbit instance and create book notes from a configurable template.

## Installation

1. Download the latest release from [GitHub Releases](https://github.com/koikurasu/obsidian-bookorbit-book-notes/releases)
2. Extract the files to your vault's `.obsidian/plugins/obsidian-bookorbit-book-notes/` folder
3. Enable the plugin in **Settings → Community plugins**

## Configuration

### Connection

1. Open **Settings → BookOrbit**
2. Enter your BookOrbit server URL
3. Enter your username and password (stored securely)
4. Click "Test connection" to verify
5. Configure output folder, template, and other settings

### Output

1. Set the **Destination folder** where notes will be created
2. Set the **Filename template** (default: `{title} ({year})`). Use `{{variable}}` to insert a value (see [Template Syntax](#template-syntax))
3. Toggle whether or not to **Open notes after creation**

### Template

1. Set the **Template file path** that the plugin will use to create notes
2. Set the **Date format** for how dates are rendered (default: `YYYY-MM-DD`)
3. Set the **Language format** for how language codes are rendered (default: `As is`)

#### Template Variables

The following variables are available in your note template:

- `{{title}}` - Book title
- `{{subtitle}}` - Book subtitle
- `{{author}}` - Authors (comma-separated)
- `{{authorsArray}}` - Authors (YAML list)
- `{{year}}` - Publication year
- `{{releaseDate}}` - Publication date (formatted)
- `{{isbn}}` - ISBN-13
- `{{isbn10}}` - ISBN-10
- `{{publisher}}` - Publisher
- `{{language}}` - Language. Rendered according to the **Language format** setting (default: as is). Options: as is, full name (title case), full name (lower case), ISO 639-1, ISO 639-2.
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

#### Template Syntax

- Use `{{variable}}` to insert a value
- Use `{{variable|default}}` to provide a fallback value
- Variables ending in `Array` render as YAML inline lists
- Empty values are kept in frontmatter (as empty strings)
- Date variables are formatted using moment.js format string

#### Example template

```
---
title: {{title}}
subtitle: {{subtitle}}
author: {{authorsArray}}
year: {{publishedYear}}
releaseDate: {{publishedDate}}
isbn: {{isbn13}}
publisher: {{publisher}}
language: {{language}}
pages: {{pageCount}}
genres: {{genresArray}}
description: {{description}}
image: {{cover}}
biblioreadsUrl: {{biblioreadsUrl}}
hardcoverUrl: {{bookorbitUrl}}
bookorbitUrl: {{bookorbitUrl}}
bookorbitID: {{bookorbitID}}
category: literature
format: book
dataSource: BookOrbit
status: {{status}}
rating: {{rating}}
startDate: {{startedAt}}
endDate: {{finishedAt}}
---

## thoughts

---

[[books.base|Books]]
```

#### Language format

The **Language format** dropdown controls how the `{{language}}` template variable is rendered. It accepts any language name or code that BookOrbit returns (e.g. `English`, `en`, `eng`, `en-US`) and applies the chosen transformation:

- **As is** - the raw value is used unchanged (default, so existing notes are unaffected)
- **Full name (title case)** - e.g. `English`
- **Full name (lower case)** - e.g. `english`
- **ISO 639-1** - the 2-letter code, e.g. `en`
- **ISO 639-2** - the 3-letter terminological code, e.g. `eng`

If the input cannot be matched to a known language, or the requested code does not exist for it (e.g. some languages have no ISO 639-1 code), the original string is returned unchanged.

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

Configure which properties update in **Settings → BookOrbit → Note updates**: each row maps a template variable (e.g. `{{title}}`) to a frontmatter key (e.g. `title`) with an on/off checkbox. If your filename template (e.g. `{{title}} ({{year}})`) uses an updated variable and the rendered name changed, the file is renamed automatically.

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
