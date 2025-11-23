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

## Export / Import System

Versioned JSON export/import for prompts (excluding notes) enables backup, transfer, and conflict-managed merges.

### Export Schema (version `1.0.0`)

```json
{
  "version": "1.0.0",
  "exportedAt": "2025-11-23T12:34:56.789Z",
  "stats": {
    "totalPrompts": 12,
    "averageRating": 3.42,
    "mostUsedModel": "gpt-4o",
    "models": { "gpt-4o": 6, "llama-3-70b": 4, "unknown-model": 2 }
  },
  "prompts": [
    {
      "id": "prompt-123",
      "title": "Blog Idea Generator",
      "content": "You are a creative assistant...",
      "createdAt": 1732360000000,
      "rating": 5,
      "metadata": {
        "model": "gpt-4o",
        "createdAt": "2025-11-23T09:10:11.123Z",
        "updatedAt": "2025-11-23T09:10:11.123Z",
        "tokenEstimate": { "min": 42, "max": 56, "confidence": "high" }
      }
    }
  ]
}
```

Notes are not exported (kept separate per prompt key). Future versions may include them after schema expansion.

### How to Export

1. Click `Export` in the header.
2. A file named `prompt-library-export-<timestamp>.json` downloads.
3. Store it safely (e.g., commit to a private repo).

### How to Import

1. Click `Import` and select a previously exported `.json` file.
2. When prompted: OK = replace all existing prompts, Cancel = merge.
3. If merging and duplicate IDs are found, a conflict dialog appears for each duplicate:
   - `keep-existing` – retain current prompt, ignore imported one.
   - `overwrite` – replace current prompt with imported version.
   - `new-id` – import a cloned copy with a new unique ID.
4. After resolving, changes apply and a status message confirms success.

### Backup & Rollback

Before import changes, a backup snapshot is stored at `localStorage` key `promptLibrary.__backup.last`. If an error occurs during import or conflict resolution, the system attempts automatic rollback to the backup.

### Validation & Integrity

Importer validates:

- Root shape (`version`, `exportedAt`, `stats`, `prompts` array)
- Supported version prefix (`1.`)
- Each prompt object and nested metadata structure

Errors produce a red status line; no partial data is committed.

### Limitations

- Notes are not included; manual migration needed if desired.
- Only schema version `1.x` supported currently.
- Very large files may exceed browser memory in low-resource environments.

### Status Messages

Import/export progress and errors appear in the footer. Messages auto-dismiss after ~8 seconds.

### Extending the Schema

Add new top-level keys; bump `version` (e.g., `1.1.0`). Maintain backward compatibility by optional chaining when reading old exports.
