# 📘 Project Best Practices

## 1. Project Purpose
PrintPrep AI Assistant helps production teams parse unstructured print job specifications (emails, XML, notes) into structured data and generate a pre‑flight checklist tailored to each job. It consists of a Next.js (App Router) web UI with serverless API routes that call the OpenAI API, plus a standalone Python utility for PII scrubbing of sample data.

## 2. Project Structure
- Root (repo)
  - `printssistant-app/` – Next.js 15 app (App Router, TypeScript, TailwindCSS)
    - `src/app/` – App Router entry
      - `page.tsx` – main page
      - `layout.tsx` – root layout
      - `globals.css` – TailwindCSS entry + theming
      - `api/parse/route.ts` – parses user-supplied content into structured specs via OpenAI
      - `api/checklist/route.ts` – generates a pre‑flight checklist based on specs via OpenAI
      - `components/` – UI client components
        - `SpecParser.tsx` – textarea input and parsing flow
        - `ChecklistView.tsx` – interactive checklist rendering
    - `src/lib/openai.ts` – OpenAI client wrapper (reads `OPENAI_API_KEY`)
    - Config
      - `eslint.config.mjs` – Next + TypeScript lint config (Flat config)
      - `tsconfig.json` – strict TypeScript config with `@/*` path alias
      - `postcss.config.mjs`, `next.config.ts`
      - `package.json` – dependencies and scripts
  - `scrubber.py` – Python 3 tool for PII scrubbing (text, XML, email), CLI included
  - `testing_data/` – sample/fixture inputs and processed outputs
  - `parse-examples.txt`, `parse-outputs.txt` – examples of input and expected extraction

Separation of concerns
- UI: Client components under `src/app/components/*` render and fetch from internal API routes.
- Server/API: Next.js route handlers under `src/app/api/*/route.ts` encapsulate OpenAI prompts and response validation.
- Integration: `src/lib/openai.ts` centralizes OpenAI client creation and env access (server-only).
- Utilities: `scrubber.py` is purposefully isolated from the web app.

Entry points and configuration
- App entry: `src/app/page.tsx`
- API entry: `src/app/api/*/route.ts`
- Env: `OPENAI_API_KEY` required on server; do not expose in client bundles.
- Lint/TypeScript: Strict TS is enabled; ESLint enforces Next/TypeScript rules.

## 3. Test Strategy
Current state: No tests are present. Recommended approach:

- Frameworks
  - Unit: Vitest or Jest
  - React components: React Testing Library + user-event
  - API routes: Direct handler invocation with mocked `NextRequest` or supertest on a minimal Next test server
  - E2E: Playwright (recommended) or Cypress

- Organization & naming
  - Place tests near code (e.g., `src/**/__tests__/*`) or use `*.test.ts(x)` co-located
  - Example structure:
    - `src/app/components/__tests__/SpecParser.test.tsx`
    - `src/app/api/parse/__tests__/route.test.ts`

- Mocking guidelines
  - Mock OpenAI at the boundary (`src/lib/openai.ts`) so app code remains unchanged
  - For browser network calls in component tests, use MSW (Mock Service Worker)
  - Prefer dependency injection or module mocking for prompt outputs

- Unit vs integration
  - Unit tests: Pure component logic (state updates, rendering), schema validation, prompt construction
  - Integration: API route handler end-to-end with mocked OpenAI; client -> API via fetch using MSW
  - E2E: User flows (paste specs → parse → display checklist)

- Coverage expectations
  - Target 80%+ lines/branches for critical paths: API route logic, prompt building, JSON parsing, UI state transitions

## 4. Code Style
TypeScript/React (Next.js App Router)
- Use strict TypeScript; define interfaces/types for all external data surfaces
- Distinguish client vs server code: add `'use client'` only where necessary
- Keep OpenAI interaction server-side only; never import `src/lib/openai.ts` in client components
- Fetch to internal API routes from client components; consider Server Actions if moving logic server-side
- Naming
  - Components: PascalCase files (e.g., `ChecklistView.tsx`)
  - Hooks/utilities: camelCase (e.g., `useSomething.ts`, `buildPrompt.ts`)
  - API routes: Next convention `api/<name>/route.ts`
- Styling
  - TailwindCSS utility-first; keep class lists readable; extract to small components when class lists become long
- Comments & docs
  - Keep prompts in constants and add a brief doc comment stating intent and output contract
  - Document interfaces for spec/checklist shapes
- Error handling
  - Validate incoming JSON with a schema (e.g., Zod) and return 4xx for client errors
  - Safely parse OpenAI responses; guard against `null/undefined` content and JSON parse errors
  - Use consistent error shapes: `{ error: string }`
  - Consider request timeouts and abort signals for fetch

Python (scrubber.py)
- Follow PEP8; keep functions small and focused
- Type-hint public functions and complex internal flows
- Avoid over-aggressive regexes; prefer conservative matches with explicit placeholders
- Provide CLI-friendly errors and exits; avoid printing stack traces by default

## 5. Common Patterns
- Centralized OpenAI client in `src/lib/openai.ts` with env check on import (server-only)
- Prompt-as-constant pattern: build a clear system prompt string; keep temperature low for deterministic JSON
- JSON output contract: use `response_format: { type: 'json_object' }` and parse defensively
- UI pattern: client component submits to internal API → normalized JSON → local UI state and progress indicator
- Type-first contracts: define `Spec` and `Checklist` interfaces to avoid `any`
- Path aliases: `@/*` for cleaner imports

## 6. Do's and Don'ts
✅ Do
- Keep all OpenAI calls in server code; never expose API keys
- Validate inputs and outputs with a schema; return precise HTTP codes (400 for validation, 500 for internal)
- Add rate limiting or basic abuse protections on API routes if exposed publicly
- Keep prompts versioned and documented; treat them as code
- Prefer small, focused client components and co-locate state where used
- Use environment variables via Next runtime only on the server; document required envs in README
- Add unit tests for prompt output parsing and UI state transitions

❌ Don’t
- Don’t import `openai` in client components
- Don’t assume OpenAI will always return valid JSON; always guard JSON.parse
- Don’t trust unbounded user input; limit size and reject overly large payloads
- Don’t couple components tightly to fetch responses; keep view logic resilient to partial data
- Don’t bypass TypeScript with `any`; define types/interfaces

## 7. Tools & Dependencies
- Next.js 15 (App Router) – full-stack React framework
- React 19 – UI library
- TailwindCSS 4 – styling via PostCSS plugin `@tailwindcss/postcss`
- ESLint 9 + `next/core-web-vitals` – linting and best practices
- TypeScript 5 – typed codebase with strict mode
- OpenAI SDK 5.x – OpenAI API client
- Python 3 (stdlib only) – `scrubber.py` tool

Setup instructions
- Prereqs: Node 18+ and npm
- App
  - `cd printssistant-app`
  - `npm install`
  - Set `OPENAI_API_KEY` in your environment (server-only)
  - Dev: `npm run dev`
  - Build: `npm run build`; Start: `npm start`
- Python scrubber
  - `python scrubber.py INPUT OUTPUT -t auto --preserve-format`
  - See in-file examples and CLI help for usage

## 8. Other Notes
- Schema-first: introduce Zod schemas for both parse and checklist outputs; narrow unknowns early
- Future-proof OpenAI usage: consider migrating to the Responses API (`client.responses.create`) for newer models
- Resilience: add retries with exponential backoff and guardrails for model timeouts
- Security: consider basic rate limiting and request size limits on API routes
- Data handling: the `testing_data/` directory is for sample/fixture data; do not upload sensitive real data
- For LLM-generated code: maintain App Router conventions (page/layout/route), client/server boundaries, and TypeScript strictness consistently