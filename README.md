# @jira-utilities/core

Lightweight wrapper around Node.js’ `fetch` for the Jira REST API (standard and Agile endpoints).

## Configuration

Copy `.env.example` to `.env` and fill in your values:

```sh
cp .env.example .env
```

| Variable          | Required       | Description                                   |
| ----------------- | -------------- | --------------------------------------------- |
| `JIRA_URL`        | yes            | Base URL of your Jira instance                |
| `JIRA_USERNAME`   | yes            | Your Jira username (email)                    |
| `JIRA_TOKEN_PATH` | one of the two | Path to a GPG-encrypted Personal Access Token |
| `JIRA_TOKEN`      | one of the two | Plain-text Personal Access Token              |

`JIRA_TOKEN_PATH` takes precedence over `JIRA_TOKEN` when both are set.

## Usage

```js
import { json, text } from "node:stream/consumers";
import { jira } from "@jira-utilities/core";

// Fetch an issue as a parsed JSON object
jira("issue/PROJ-123").get().then(json).then((issue) => ...);

// Fetch an issue as raw text
jira("issue/PROJ-123").get().then(text).then((str) => ...);

// Update an issue
jira("issue/PROJ-123").put({ fields: { summary: "New summary" } }).then(...);

// Create an issue
jira("issue").post({
  fields: {
    project: { key: "PROJ" },
    summary: "My new issue",
    issuetype: { name: "Bug" },
  },
}).then(...);

// The endpoint can be passed directly to the method instead:
jira.get('issue/PROJ-123').then(json).then(...);
jira.put('issue/PROJ-123', { fields: { summary: 'New summary' } }).then(...);
jira.post('issue', { fields: { ... } }).then(...);
```

### Agile API

```js
jira.agile("sprint/123").get().then(...);
jira.agile("sprint/123").post({ state: "active" }).then(...);

// Or directly passsing the endpoint to the method:
jira.agile.get("board/42").then(...);
jira.agile.post("sprint", { name: "Sprint 1", originBoardId: 42 }).then(...);
```

### Options

```js
// Enable debug logging
jira("issue/PROJ-123").withOptions({ debug: true }).get().then(json).then(...);

// withOptions works with both call styles
jira.withOptions({ debug: true }).get("issue/PROJ-123").then(json).then(...);
```
