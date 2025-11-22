# Prompt Library

Simple local prompt library built with HTML, CSS, and vanilla JavaScript. Stores prompts in `localStorage` so they persist across page reloads (in the same browser).

## Features

- Add prompt with title and full content
- Save prompts to `localStorage`
- Display saved prompts as responsive cards
- Each card shows: title + truncated content preview (first 15 words)
- Delete button removes prompt instantly and updates display
- Dark developer theme styling
- Interactive 5-star rating per prompt (stored in localStorage)
- Rating filter (show only prompts with minimum stars)

## Usage

Open the `index.html` file in any modern browser:

```bash
xdg-open index.html
```

(Or just double-click it in your file browser.)

## File Overview

- `index.html` – Markup structure and form
- `styles.css` – Dark themed, responsive styles
- `app.js` – Logic: localStorage CRUD + rendering

## Storage Key

Uses `promptLibrary.prompts` in `localStorage`.

## Notes

- No external dependencies
- Prompts are ordered with newest first
- Preview truncation is word-based (15 words)
- Keyboard accessible rating (arrow keys + enter/space)
- Rating stored as integer 0–5 (0 = unrated)
