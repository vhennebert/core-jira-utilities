# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@jira-utilities/core` is a lightweight ESM wrapper around `fetch` for the Jira REST API (both standard and Agile endpoints). Authentication is handled via a GPG-encrypted Personal Access Token or a plain-text token, loaded from environment variables or a `.env` file.

## Commands

```sh
npm test         # run vitest in watch mode
npm test -- run  # run all tests once
```

## Code Style

- **Pure JavaScript, ESM only** — no TypeScript, no CommonJS
- **Node.js 22+** — prefer Node.js built-ins (`node:` prefix) over third-party packages
- **Functional style inspired by Clojure**: pure functions, immutability, composition over mutation
- **Promise-based**: chain `.then()` instead of `await`; use `await` only when it eliminates promise nesting
- **No code duplication** — extract shared logic rather than copy-pasting
- **Always use curly braces** around `if`/`else` bodies, even for single statements

## Testing

- **Framework**: vitest
- **TDD for non-trivial code**: write a failing test first, then the implementation
- Test files live alongside their source files (`jira.test.js`, `env.test.js`)

## Architecture

### `env.js`

Loads configuration at module initialisation time. Reads `.env` from the current working directory (if present), then merges with `process.env` (system env takes precedence). Validates that required variables are present, decrypts the token via `gpg --decrypt` if `JIRA_TOKEN_PATH` is set, otherwise falls back to `JIRA_TOKEN`. Exports `JIRA_URL` and `JIRA_AUTHORIZATION`.

### `jira.js`

Exports `jira` as a named export — a function that is also an object, supporting two call styles:

- **Endpoint-first**: `jira(endpoint).get()` / `.post(body)` / `.put(body)` / `.withOptions({...})`
- **Direct**: `jira.get(endpoint)` / `jira.post(endpoint, body)` / `jira.put(endpoint, body)` / `jira.withOptions({...})`

`jira.agile` mirrors the same interface but targets `/rest/agile/latest` instead of `/rest/api/latest`.

`withOptions` supports `{ debug }` and is immutable — it returns a new object without mutating the original. Responses always return a `ReadableStream`; use `node:stream/consumers` (`json`, `text`, …) in the call chain to consume it.

### `index.js`

Barrel re-export of all named exports. Add new utilities here as the library grows.

### Testing approach

- `jira.test.js` mocks `./env.js` entirely via `vi.doMock`, injecting fixed `JIRA_URL` and `JIRA_AUTHORIZATION` values. The test suite is parameterised and runs once for `jira` and once for `jira.agile`.
- `env.test.js` mocks `node:fs` and `node:child_process`, reloading the module fresh per test via `vi.resetModules()` + dynamic import.
