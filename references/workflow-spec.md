# Buddy — Workflow Specification

## Lifecycle Overview

```
User: "Hey Buddy, <task>"
  │
  ├─ -1. Codebase Mapper → Create/update ARCHITECTURE.md, CODING_STANDARDS.md, CODEBASE_MAP.md (first time or when changed)
  ├─ 0. Initialize        → Create .buddy/state.json with run_id
  ├─ 1. Analyze           → Understand the task, classify, identify files & MCPs
  ├─ 2. Enhance Prompt    → Build a rich, structured prompt from raw task
  ├─ 3. Research          → Deep-dive codebase + external docs
  ├─ 4. Plan              → File-by-file implementation plan
  ├─ 5. Verify Plan       → Quality gate (score ≥ 7 to pass)
  │     └─ if rejected    → return to Step 4 with feedback (max 3)
  ├─ 6. Develop           → Implement the code (with deviation rules)
  ├─ 6b. Verify Code      → Goal-backward verification (exists, substantive, wired)
  │     └─ if rejected    → return to Step 6 with gaps (max 2)
  ├─ 6c. Atomic Commit    → Commit per task, update AGENTS.md ⭐ NEW
  ├─ 6d. Review Code      → Quality gate (score ≥ 7 to pass)
  │     └─ if rejected    → return to Step 6 with feedback (max 2)
  │     └─ [Repeat 6-6d for each task]
  ├─ 7. Integration Check → Cross-component wiring verification
  │     └─ if gaps found  → Create targeted fix tasks (max 2)
  ├─ 8. Test              → Run test suite + verify acceptance criteria (+ Playwright for UI)
  │     └─ if failed      → return to Step 6 with test failures
  ├─ 9. Lint & Fix        → Run linter, auto-fix issues
  ├─ 10. Create PR        → Push commits, create comprehensive PR
  └─ 11. Complete         → Update Linear to Done (if linked) + report results
```

## Continuous Watcher Mode (NEW)

```
User: "Hey Buddy, start watching Linear"
  │
  ├─ Load .buddy/watcher-state.json
  ├─ Use Linear MCP to fetch assigned issues
  ├─ Filter out already-seen issues
  ├─ Present new issues to user
  ├─ [Prompt mode] Ask what to do
  └─ [Auto mode] Work through all issues by priority
       ├─ Update status to In Progress (via MCP)
       ├─ Run full Buddy workflow (Step 0-11)
       ├─ Update status to Done (via MCP)
       └─ Continue to next issue
```

## Loop Control

- **Max iterations**: 10 (total retries across all steps combined)
- **Iteration counter**: incremented each time a step sends back for revision
- If max iterations reached: report partial state, ask user for guidance
- If any step errors unexpectedly: mark as `failed`, report to user

## State Machine

Each step can be in one of:
| Status | Meaning |
|--------|---------|
| `pending` | Not yet started |
| `running` | Currently executing |
| `done` | Completed successfully |
| `needs-revision` | Sent back for rework |
| `failed` | Unrecoverable error |
| `skipped` | Intentionally skipped (e.g., tester skipped for docs-only tasks) |

## Resume Behavior

If `.buddy/state.json` exists with `status: "running"`:

1. Read `current_step` from state
2. Skip all steps with `status: "done"`
3. Continue from `current_step`
4. Never re-run completed steps (unless user explicitly asks)

## Skipping Steps

The agent may skip steps based on task type:

- **Docs-only task** → skip `tester` (no code to test)
- **Simple bug fix** → may skip `researcher` if the bug location is obvious
- **Low complexity** → agent's discretion on skipping `prompt-enhancer`

Always log skipped steps in state with `status: "skipped"` and a reason.

## MCP Routing (Phase 2+)

| Need | MCP Tool | Purpose |
| ---- | -------- | ------- |
| Search Linear issues | `mcp__linear__search_issues` | Filter by assignee, status |
| Get Linear issue details | `mcp__linear__get_issue` | Full issue with comments |
| Update Linear status | `mcp__linear__update_issue` | In Progress → Done |
| Add Linear comment | `mcp__linear__create_comment` | Work progress updates |
| Create GitHub PR | GitHub MCP | Push PR to repository |
| UI/browser testing | Playwright MCP | Visual validation of UI |
| API endpoint testing | HTTP MCP | Test API responses |
| Run shell commands | Bash MCP | Execute CLI commands |
| Web research | Web Search MCP | Find documentation |
| Cross-session memory | Memory MCP | Persist context |
| Progress to Slack | Slack MCP | Notify team |

## Git Workflow (Phase 2)

1. Check if branch `linear/{issue-id}` already exists
2. If yes: checkout and pull
3. If no: create from `dev` branch
4. All commits go to this branch
5. PR targets `dev` branch (configurable)
6. PR title: `[linear/{issue-id}] <task summary>`
7. PR body: generated from the Buddy run summary

---

## Persistent Documentation Files (NEW)

### File Tracking

| File | Created By | Updated By | Purpose |
|------|-----------|-----------|---------|
| `ARCHITECTURE.md` | Codebase Mapper | Codebase Mapper | Project structure, tech stack, decisions |
| `CODING_STANDARDS.md` | Codebase Mapper | Codebase Mapper | Naming, style, patterns |
| `CODEBASE_MAP.md` | Codebase Mapper | Codebase Mapper | File relationships, API routes |
| `AGENTS.md` | Buddy System | Developer | Activity log, changes made |

### AGENTS.md Auto-Update

The Developer agent automatically updates `AGENTS.md` after each atomic commit:

1. **Last Updated** - Current date and run info
2. **Recent Activity Log** - New entry for each task
3. **Files Changed** - Table with file, action, agent, commit
4. **Statistics** - Counters for runs, files, commits, PRs

### Documentation Lifecycle

```
First Run:
  Codebase Mapper → Creates ARCHITECTURE.md, CODING_STANDARDS.md, CODEBASE_MAP.md

Each Task:
  Developer → Reads CODING_STANDARDS.md before writing code
  Developer → Updates AGENTS.md after each commit

Structure Change:
  Codebase Mapper → Updates all three documentation files
```
