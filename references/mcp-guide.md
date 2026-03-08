# Buddy — MCP Configuration Guide

This guide covers how to configure each MCP server for use with the Buddy orchestrator.

> **Phase 1** runs without any MCP servers (uses filesystem + bash directly).
> MCP servers are fully wired in **Phase 2** (Linear, GitHub) and **Phase 3** (Playwright, HTTP, Bash, Web Search, Memory, Slack).

---

## Phase 2 MCPs

### Linear MCP

Used by: `agents/linear-reader/SKILL.md` (task listing + details)

**Setup:**

1. Get your Linear API key from: Linear → Settings → API → Personal API keys
2. Add to your project `.env`:
   ```
   LINEAR_API_KEY=lin_api_xxxxxxxxxxxx
   ```
3. Add to your agent's MCP config (e.g. `.agent/settings.json` or equivalent):
   ```json
   {
     "mcpServers": {
       "linear": {
         "command": "npx",
         "args": ["-y", "@anthropic/linear-mcp"],
         "env": { "LINEAR_API_KEY": "${LINEAR_API_KEY}" }
       }
     }
   }
   ```

**Key MCP tools used by Buddy:**

- `listIssues` — filter by assignee, team, status
- `getIssue` — full issue details (description, comments, labels)
- `updateIssue` — set status to "In Progress"

### GitHub MCP

Used by: Main SKILL.md Step 9 (PR creation)

**Setup:**

1. Create a GitHub personal access token with `repo` scope
2. Add to your project `.env`:
   ```
   GITHUB_TOKEN=ghp_xxxxxxxxxxxx
   ```
3. Add to your agent's MCP config:
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "npx",
         "args": ["-y", "@anthropic/github-mcp"],
         "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
       }
     }
   }
   ```

**Key MCP tools used by Buddy:**

- `createPullRequest` — create PR from `linear/{issue-id}` to `dev`
- `listBranches` — check if branch already exists remotely

> **Note:** Git branch/commit/push operations are handled by `scripts/git-ops.js` directly (not MCP). GitHub MCP is only used for PR creation.

### Memory MCP

Used by: State manager (cross-session persistence fallback)

**Setup:** Configure Memory MCP in your agent's MCP settings.

---

## Phase 3 MCPs

### Playwright MCP

Used by: Tester agent (UI/frontend tasks)

**When Buddy uses it:** If `task_type` is `frontend` or `fullstack` and `playwright` is in `mcps_needed`.

**Setup:**

Add to your agent's MCP config:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@browserbasehq/mcp-server-playwright"]
    }
  }
}
```

### HTTP MCP

Used by: Tester agent (API endpoint testing)

**When Buddy uses it:** If `task_type` is `backend` or `fullstack` and `http` is in `mcps_needed`.

**Setup:**

Add to your agent's MCP config:
```json
{
  "mcpServers": {
    "http": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-http"]
    }
  }
}
```

### Bash MCP

Used by: Tester agent (running test commands)

**When Buddy uses it:** Always available for running `npm test`, `pytest`, etc. securely inside an agent environment without granting direct shell access blindly.

**Setup:**

Add to your agent's MCP config:
```json
{
  "mcpServers": {
    "bash": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-bash"]
    }
  }
}
```

### Web Search MCP

Used by: Researcher agent (unfamiliar technologies)

**When Buddy uses it:** If `web-search` is in `mcps_needed` from the Analyzer output.

**Setup:**

1. Get a Brave Search API key (or similar supported search MCP).
2. Add to your project `.env`:
   ```
   BRAVE_API_KEY=xxxxxxxxxxxx
   ```
3. Add to your agent's MCP config:
   ```json
   {
     "mcpServers": {
       "brave-search": {
         "command": "npx",
         "args": ["-y", "@anthropic/mcp-server-brave-search"],
         "env": { "BRAVE_API_KEY": "${BRAVE_API_KEY}" }
       }
     }
   }
   ```

### Slack MCP

Used by: Progress Reporter (Phase 4)

**When Buddy uses it:** Configured in Phase 4 for streaming progress to a Slack channel.

---

## Checking MCP Availability

The agent will check which MCPs are configured before starting:

```bash
node .agent/skills/buddy/scripts/check-env.js
```

Buddy gracefully degrades when MCPs are unavailable — it falls back to direct operations where possible and skips MCP-dependent steps when necessary.
