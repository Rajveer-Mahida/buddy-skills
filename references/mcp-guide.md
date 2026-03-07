# Buddy — MCP Configuration Guide

This guide covers how to configure each MCP server for use with the Buddy orchestrator.

> **Phase 1** runs without any MCP servers (uses filesystem + bash directly).
> MCP servers are fully wired in **Phase 2** (Linear, GitHub) and **Phase 3** (Playwright, HTTP, Bash, Web Search, Memory, Slack).

---

## Phase 2 MCPs

### Linear MCP

Used by: Buddy main SKILL.md (task listing), Analyzer (reading task details)

**Setup:**

1. Get your Linear API key from: Linear → Settings → API → Personal API keys
2. Add to your project `.env`:
   ```
   LINEAR_API_KEY=lin_api_xxxxxxxxxxxx
   ```
3. Install the Linear MCP server in your agent's MCP config

**Capabilities used by Buddy:**

- List issues assigned to the user
- Read issue title, description, priority, labels, comments
- Update issue status (in progress, done)

### GitHub MCP

Used by: Developer agent (branch/commit), Buddy (PR creation)

**Setup:**

1. Create a GitHub personal access token with `repo` scope
2. Add to your project `.env`:
   ```
   GITHUB_TOKEN=ghp_xxxxxxxxxxxx
   ```
3. Install the GitHub MCP server in your agent's MCP config

**Capabilities used by Buddy:**

- Create branches from `dev`
- Create pull requests targeting `dev`
- Add PR descriptions generated from the run summary
- Check if branch `linear/{issue-id}` already exists

### Memory MCP

Used by: State manager (cross-session persistence fallback)

**Setup:** Configure Memory MCP in your agent's MCP settings.

---

## Phase 3 MCPs

### Playwright MCP

Used by: Tester agent (UI/frontend tasks)

**When Buddy uses it:** If `task_type` is `frontend` or `fullstack` and `playwright` is in `mcps_needed`.

**Setup:** Install `@playwright/mcp` and configure in your agent.

### HTTP MCP

Used by: Tester agent (API endpoint testing)

**When Buddy uses it:** If `task_type` is `backend` or `fullstack` and `http` is in `mcps_needed`.

### Bash MCP

Used by: Tester agent (running test commands)

**When Buddy uses it:** Always available for running `npm test`, `pytest`, etc.

### Web Search MCP

Used by: Researcher agent (unfamiliar technologies)

**When Buddy uses it:** If `web-search` is in `mcps_needed` from the Analyzer output.

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
