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
- Per-prompt notes section: add, edit, save, delete notes (localStorage)
- Prompt metadata tracking (model, timestamps, token estimation, confidence)

### Notes Feature

Each prompt card includes a lightweight notes section for contextual tips or usage variants.

Capabilities:

- Add note (textarea with live character count `current / 500`)
- Edit note inline (Edit toggles to textarea with Save/Cancel)
- Delete note (immediate removal)
- Visual saved badge appears briefly after create/update
- Validation: prevents empty notes and consecutive duplicate note content (case-insensitive)
- Limit: maximum 20 notes per prompt (form hides when limit reached)
- Handles `localStorage` quota errors (shows red banner; note not persisted)
- Data isolation: notes stored separately per prompt under unique key

Data structure per prompt (stored at key `promptNotes:<promptId>`):

```json
[
  {
    "id": "note-abc123",
    "content": "Works best with short product descriptions.",
    "createdAt": 1732286400000,
    "updatedAt": 1732286400000
  }
]
```

Notes are only rendered client-side; no external dependencies.

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
- Metadata system: attaches a `metadata` object per prompt with model info and token estimates

## Storage Key

Uses `promptLibrary.prompts` in `localStorage`.

## Notes

- No external dependencies
- Prompts are ordered with newest first
- Preview truncation is word-based (15 words)
- Keyboard accessible rating (arrow keys + enter/space)
- Rating stored as integer 0–5 (0 = unrated)
- Metadata confidence colors: green (high), yellow (medium), red (low)

## Metadata Tracking System

Each prompt receives a metadata object when created (or retrofitted for legacy prompts):

```json
{
  "model": "gpt-4o",
  "createdAt": "2025-11-23T12:00:00.000Z",
  "updatedAt": "2025-11-23T12:00:00.000Z",
  "tokenEstimate": {
    "min": 42,
    "max": 56,
    "confidence": "high"
  }
}
```

### Functions

- `trackModel(modelName: string, content: string)` – validates model name, generates ISO timestamps, detects if content looks like code, estimates tokens.
- `updateTimestamps(metadata: MetadataObject)` – refreshes `updatedAt`, ensures it is not earlier than `createdAt`.
- `estimateTokens(text: string, isCode: boolean)` – calculates a rough range using: `min = 0.75 * word_count`, `max = 0.25 * character_count`; both multiplied by `1.3` if `isCode`.

Confidence levels are determined by the `max` estimate: `<1000 = high`, `1000–5000 = medium`, `>5000 = low`.

### Validation Rules

- Model name: non-empty string, ≤ 100 chars.
- Dates: ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- Errors throw with descriptive messages; UI surfaces basic alerts.

### UI Display

Metadata appears on each card showing model, human-readable timestamps, token range, and color-coded confidence. A "Refresh Metadata" button updates the `updatedAt` timestamp only.

### Code Detection Heuristic

Automatically flags content as code if it contains common code keywords (`function`, `class`, `import`, backticks, etc.). You can override by checking the "Treat content as code" box when creating a prompt.

### Updating / Access

Runtime API exposed for debugging:

```js
window.__promptMetadataAPI.trackModel(...)
window.__promptMetadataAPI.updateTimestamps(...)
window.__promptMetadataAPI.estimateTokens(...)
```
