# Hold my Thought

A full-stack TypeScript application that converts mixed-format document folders into a structured, wiki-like knowledge workspace.

The app accepts a batch of files, extracts text and tabular content server-side, uses Gemini to infer the collection intent and entities, then renders an entity-centric “data wiki” in the browser with provenance preserved for each extracted artifact.

---

## What the Project Does

At a high level, **Hold my Thought** is a "folder-to-knowledge" pipeline:

1. **Ingest** a folder of heterogeneous files (`.xlsx`, `.xls`, `.csv`, `.tsv`, `.ods`, `.pdf`, `.txt`, `.docx`, `.png`, `.jpg`, `.jpeg`).
2. **Extract** machine-readable content:
   - Tables from spreadsheets.
   - Text from PDFs and plain text files.
   - Raw text and embedded tables from DOCX.
   - OCR text (with confidence score) from images.
3. **Normalize** extracted outputs into a common JSON structure (`ParsedFile`, `TableData`).
4. **Classify** the folder’s semantic intent (single subject, comparable entities, or timeline/process) using Gemini.
5. **Group entities** and map files/tables to each entity.
6. **Render** a polished, navigable wiki-style UI that presents:
   - entity navigation,
   - table-of-contents linking to extracted tables,
   - source prose and traceability metadata.

---

## Current Architecture

## 1) Runtime Topology

The project runs as a single Node process that hosts both API endpoints and the frontend in dev/prod modes:

- **Backend server**: Express (`server.ts`).
- **Frontend app**: React + Vite (`src/App.tsx`, `src/main.tsx`).
- **Development mode**: Express mounts Vite middleware (hot reload/dev server behavior).
- **Production mode**: Express serves static assets from `dist`.

This keeps deployment simple while separating responsibilities logically between extraction APIs and UI orchestration.

## 2) Backend Responsibilities (`server.ts`)

### File intake
- Uses `multer` with in-memory storage and a 50 MB per-file cap.
- Accepts multi-file upload under the `files` form key.

### Core endpoint
- `POST /api/process-files` is the main extraction pipeline.
- `GET /api/health` provides a simple health status check.

### Extraction strategy by file type

- **Spreadsheet family** (`.xlsx`, `.xls`, `.csv`, `.tsv`, `.ods`)
  - Parsed via `xlsx`.
  - Sheets are transformed to row arrays.
  - Heuristic table detection: at least 2 rows and at least 2 columns.

- **Text / PDF** (`.txt`, `.pdf`)
  - TXT: UTF-8 decode from buffer.
  - PDF: parsed via `pdf-parse`.
  - Additional simple layout heuristic: lines split by 2+ spaces are treated as aligned columns and promoted to table-like structures.

- **Word documents** (`.docx`)
  - Uses `mammoth` for both raw text extraction and HTML conversion.
  - `<table>` fragments are captured and stored as HTML-backed table artifacts.

- **Images** (`.png`, `.jpg`, `.jpeg`)
  - OCR via `tesseract.js`.
  - Stores OCR text and confidence; marks `needsReview` when confidence < 70.

### Output contract
The endpoint returns:

- `results`: normalized extracted file records including table/text/provenance payloads.
- `errors`: per-file errors for unsupported formats or parsing failures.

This contract is consumed directly by the React pipeline.

## 3) Frontend Responsibilities (`src/App.tsx`)

The frontend orchestrates a seven-step UX pipeline using stateful progress tracking:

1. Discovery/upload
2. Server extraction
3. Normalization state update
4. Intent analysis (Gemini)
5. Entity resolution prep
6. Wiki artifact generation
7. Final entity wiki rendering

### AI stages

- **Folder intent classification**
  - Model call to `gemini-3-flash-preview`.
  - Expected schema: `{ topic, type, confidence, entityType }`.

- **Entity list generation** (when intent is `MULTIPLE_COMPARABLE`)
  - Model returns array of entity names.
  - Client then performs heuristic matching against filename/text/table cells to assign source artifacts to each entity.

Fallback behavior is implemented for AI failures (default intent/entity grouping), ensuring the UI still resolves to a usable output.

### Presentation layer

The UI provides:

- drag-and-drop + folder upload flow,
- processing progress visualization,
- sidebar entity navigation,
- generated wiki page with:
  - structured table sections,
  - additional documentation prose,
  - per-table provenance labels,
  - source manifest popout.

---

## Data Model (Current)

### `TableData`
Represents extracted structured content:
- identity (`tableId`),
- optional `sheetName`,
- dimensions (`rowCount`, `colCount`),
- optional row matrix (`data`) or DOCX HTML table (`html`),
- `provenance` string for traceability.

### `ParsedFile`
Represents one processed input file:
- file metadata (`fileId`, `fileName`, `fileType`, `sizeBytes`),
- zero or more extracted `tables`,
- extracted `text`,
- optional OCR quality fields (`ocrConfidence`, `needsReview`).

### `FolderIntent`
Semantic classification of the upload batch:
- `topic`,
- `type` in `{SINGLE_ENTITY, MULTIPLE_COMPARABLE, PROCESS_TIMELINE}`,
- optional `confidence` and `entityType`.

### `Entity`
Links inferred entity names to source artifacts:
- `entity_name`,
- associated `files`,
- associated `tables`.

---

## Request/Processing Flow

```text
Browser folder upload
  -> POST /api/process-files
      -> parse file(s) by extension
      -> extract text/tables/OCR
      -> return normalized JSON
  -> client receives extraction payload
  -> Gemini intent classification
  -> Gemini entity name generation (conditional)
  -> heuristic entity-to-artifact matching
  -> wiki UI render
```

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Lucide icons, Motion.
- **Backend**: Node.js, Express, Multer.
- **Document extraction**: `xlsx`, `pdf-parse`, `mammoth`, `tesseract.js`, `mime-types`.
- **AI**: `@google/genai` (Gemini API).
- **Build/serve**: `vite`, `esbuild`, `tsx`.

---

## Getting Started

## Prerequisites
- Node.js 18+ (recommended modern LTS)
- A Gemini API key

## Environment setup
1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```
2. Set your key:
   ```env
   GEMINI_API_KEY=your_key_here
   ```

## Install and run (development)
```bash
npm install
npm run dev
```

The app listens on `http://localhost:3000` (Express), with Vite middleware integrated during development.

## Production build and run
```bash
npm run build
npm run start
```

---

## Available Scripts

- `npm run dev` — starts the Express+Vite development server.
- `npm run build` — builds frontend assets and bundles backend into `dist/server.cjs`.
- `npm run start` — runs bundled production server.
- `npm run clean` — removes build artifacts.
- `npm run lint` — runs TypeScript type check (`tsc --noEmit`).

---

## Current Constraints and Notes

- Extraction is currently heuristic-heavy (especially table detection from plain text).
- OCR is CPU-intensive and performed per image file.
- Entity mapping after AI name generation is string-match based and may require refinement for noisy corpora.
- The “Download Wiki Bundle” button is currently UI-only (no export endpoint implemented yet).

---

## Suggested Next Architectural Improvements

- Move extraction pipeline to asynchronous jobs for large folders.
- Add persistent storage for sessions and generated wiki artifacts.
- Add richer document structure parsing (e.g., heading/section extraction).
- Add confidence/quality overlays for AI classification and entity mapping.
- Implement actual wiki bundle export format (HTML/Markdown/JSON package).

