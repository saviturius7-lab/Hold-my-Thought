# Hold my Thought

**Hold my Thought** is a full-stack TypeScript application that transforms mixed-format folders into a structured, entity-first knowledge workspace.

It ingests documents and tabular files, extracts text/tables/OCR results, infers collection intent with Gemini, and renders a wiki-like interface where extracted artifacts stay traceable back to their source files.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Architecture Overview](#architecture-overview)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Data Contracts](#data-contracts)
- [End-to-End Processing Flow](#end-to-end-processing-flow)
- [Technology Stack](#technology-stack)
- [Setup and Run](#setup-and-run)
- [Scripts](#scripts)
- [Current Limitations](#current-limitations)
- [Extension Roadmap](#extension-roadmap)

---

## What It Does

The application implements a **folder-to-wiki pipeline**:

1. **Ingests a folder upload** from the browser (`multipart/form-data` under `files`).
2. **Parses each file by extension** and extracts:
   - tables from spreadsheet-like files,
   - text from PDFs/TXT,
   - text + table HTML from DOCX,
   - OCR text and confidence from images.
3. **Normalizes extraction output** into a common structure used by the UI.
4. **Classifies the upload intent** with Gemini into one of:
   - `SINGLE_ENTITY`
   - `MULTIPLE_COMPARABLE`
   - `PROCESS_TIMELINE`
5. **Builds entity groupings** and links each entity to relevant files/tables.
6. **Renders a navigable wiki view** with provenance-aware table sections and source text panels.

In short: it turns unstructured file collections into a browsable, semantically grouped knowledge artifact.

---

## Architecture Overview

The system uses a single Node runtime hosting both API and UI concerns:

- **Server layer (Express)** handles upload, extraction, and API responses.
- **Client layer (React)** orchestrates workflow state, AI calls, and wiki rendering.
- **Dev mode** uses Vite middleware mounted into Express.
- **Prod mode** serves prebuilt static assets from `dist` and runs a bundled Node server.

### Logical Architecture

```text
[Browser UI]
   | upload folder
   v
[Express API: /api/process-files]
   | parse/extract by file type
   v
[Normalized JSON payload]
   | client-side AI intent + entity grouping
   v
[Entity-centric Wiki Renderer]
```

---

## Backend Architecture

Primary file: `server.ts`

### 1) HTTP and Runtime Setup

- Starts Express on port `3000`.
- Enables JSON payload handling (`50mb` limit).
- Uses Multer memory storage for multi-file intake with a `50MB` per-file cap.

### 2) API Surface

- `GET /api/health`
  - Basic readiness endpoint returning `{ status: "ok" }`.

- `POST /api/process-files`
  - Main extraction endpoint.
  - Accepts `upload.array("files")`.
  - Iterates each file and applies extension-specific extractors.
  - Returns:
    - `results`: normalized parsed files
    - `errors`: unsupported-type or per-file processing errors

### 3) Extraction Strategies by Type

#### Spreadsheet group
Supported: `.xlsx`, `.xls`, `.csv`, `.tsv`, `.ods`

- Uses `xlsx` to parse workbook/sheets.
- Converts sheets to row arrays (`sheet_to_json(..., { header: 1 })`).
- Detects candidate tables using a simple heuristic (>=2 rows and >=2 columns).
- Emits table metadata + raw row matrix + provenance.

#### Text and PDF group
Supported: `.txt`, `.pdf`

- TXT: UTF-8 decode.
- PDF: parsed with `pdf-parse`.
- Runs lightweight aligned-column detection for table-like text:
  - split line by `\s{2,}`,
  - treat multi-column lines as row candidates,
  - emit extracted table when enough rows exist.

#### DOCX group
Supported: `.docx`

- Uses `mammoth` for:
  - raw text extraction,
  - HTML conversion.
- Extracts `<table>` fragments from HTML and stores them as table artifacts.

#### Image group
Supported: `.png`, `.jpg`, `.jpeg`

- Uses `tesseract.js` OCR worker.
- Stores OCR text and confidence score.
- Flags low-confidence results (`needsReview`) if confidence < 70.

### 4) Error Handling Model

- Unsupported types are skipped and added to `errors`.
- Per-file extractor failures are caught and logged, then appended to `errors`.
- Endpoint still returns partial success when possible.

### 5) Serving Strategy

- **Development**: mounts Vite middleware (`middlewareMode: true`).
- **Production**: serves static assets from `dist`, with SPA fallback to `index.html`.

---

## Frontend Architecture

Primary file: `src/App.tsx`

The frontend behaves like a pipeline orchestrator plus renderer.

### 1) Stateful Workflow

Core state includes:

- upload/progress (`isUploading`, `step`),
- extraction artifacts (`parsedFiles`, `errors`),
- semantic outputs (`folderIntent`, `entities`, `selectedEntity`),
- UX state (`isDragging`).

### 2) Seven-Step Processing Model

The UI tracks a progressive workflow:

1. file discovery/upload start,
2. server extraction request,
3. normalization state commit,
4. intent analysis (Gemini),
5. entity resolution setup,
6. wiki artifact generation,
7. final wiki view ready.

### 3) AI Integration Pattern

- Reads API key from `GEMINI_API_KEY`.
- Uses `@google/genai` and model `gemini-3-flash-preview`.

Two AI tasks are performed:

1. **Intent classification**
   - returns topic/type/confidence/entity type.
2. **Entity enumeration** (only for `MULTIPLE_COMPARABLE`)
   - returns a string array of candidate entity names.

If model calls fail, the app falls back to deterministic defaults and still produces output.

### 4) Entity Mapping Heuristic

After AI returns candidate names, the client maps each name to files/tables using string containment across:

- filename,
- extracted file text,
- extracted table cell text.

This creates the entity-to-artifact graph used by the UI.

### 5) Rendering Model

The final layout includes:

- left sidebar entity registry,
- progress/status indicators,
- wiki page per selected entity,
- sectioned tables with provenance labels,
- additional documentation blocks with raw source popup support.

---

## Data Contracts

The current in-app contracts are defined in TypeScript interfaces in `src/App.tsx`.

### `TableData`
Represents extracted structured content.

Fields:
- `tableId`
- optional `sheetName`
- `rowCount`
- `colCount`
- optional `data` (row matrix)
- optional `html` (DOCX table)
- `provenance`

### `ParsedFile`
Represents one processed file.

Fields:
- `fileId`, `fileName`, `fileType`, `sizeBytes`
- `tables: TableData[]`
- `text`
- optional `ocrConfidence`
- optional `needsReview`

### `FolderIntent`
Represents AI intent output.

Fields:
- `topic`
- `type` (`SINGLE_ENTITY | MULTIPLE_COMPARABLE | PROCESS_TIMELINE`)
- `confidence`
- optional `entityType`

### `Entity`
Represents grouped knowledge units.

Fields:
- `entity_name`
- `files: string[]`
- `tables: string[]`

---

## End-to-End Processing Flow

```text
Browser folder upload
  -> POST /api/process-files
      -> extension-based extraction pipeline
      -> normalized { results, errors }
  -> client pipeline resumes
      -> Gemini intent classification
      -> conditional Gemini entity list
      -> heuristic entity-artifact mapping
  -> wiki render
```

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Motion, Lucide.
- **Backend**: Node.js, Express, Multer.
- **Parsing/OCR**: xlsx, pdf-parse, mammoth, tesseract.js, mime-types.
- **AI**: `@google/genai` (Gemini).
- **Build tooling**: esbuild, tsx.

---

## Setup and Run

### Prerequisites

- Node.js 18+ (modern LTS recommended)
- Gemini API key

### Environment

```bash
cp .env.example .env.local
```

Set:

```env
GEMINI_API_KEY=your_api_key_here
```

### Development

```bash
npm install
npm run dev
```

App URL: `http://localhost:3000`

### Production

```bash
npm run build
npm run start
```

---

## Scripts

- `npm run dev` — runs Express with Vite middleware in development.
- `npm run build` — builds frontend and bundles backend to `dist/server.cjs`.
- `npm run start` — runs bundled production server.
- `npm run clean` — removes build artifacts.
- `npm run lint` — TypeScript check (`tsc --noEmit`).

---

## Current Limitations

- Extraction quality for plain-text tables depends on whitespace layout.
- OCR can be slow for large image sets due to per-image worker execution.
- Entity mapping is lexical/heuristic and can misgroup ambiguous terms.
- No persisted session storage yet; processing is request/response scoped.
- “Download Wiki Bundle” UI action is present, but no backend export implementation exists.

---

## Extension Roadmap

High-impact architectural improvements:

1. Move extraction to async jobs/queues for large uploads.
2. Add durable storage for sessions, artifacts, and provenance indexes.
3. Introduce stronger table/section detectors for semi-structured text.
4. Add confidence overlays and manual correction loops in UI.
5. Implement actual wiki bundle export (HTML/Markdown/JSON package).
6. Add auth + multitenant boundaries if used in shared environments.

