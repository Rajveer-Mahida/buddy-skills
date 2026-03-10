# Buddy — Workflow Specification

## Lifecycle Overview

```
User: "Hey Buddy, <task>"
  │
  ├─ 0. Initialize     → Create .buddy/state.json with run_id
  ├─ 1. Analyze        → Understand the task, classify, identify files & MCPs
  ├─ 2. Enhance Prompt → Build a rich, structured prompt from raw task
  ├─ 3. Research       → Deep-dive codebase + external docs
  ├─ 4. Plan           → File-by-file implementation plan
  ├─ 5. Review Plan    → Quality gate (score ≥ 7 to pass)
  │     └─ if rejected → return to Step 4 with feedback
  ├─ 6. Develop        → Implement the code
  ├─ 7. Test           → Run test suite + verify acceptance criteria
  │     └─ if failed   → return to Step 6 with test failures
  ├─ 8. Review Code    → Quality gate (score ≥ 7 to pass)
  │     └─ if rejected → return to Step 6 with review feedback
  └─ 9. Complete       → Update Linear to Done (if linked) + report results to user
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

| Need                 | MCP to use     |
| -------------------- | -------------- |
| Fetch Linear tasks   | Linear MCP     |
| Create GitHub PR     | GitHub MCP     |
| UI/browser testing   | Playwright MCP |
| API endpoint testing | HTTP MCP       |
| Run shell commands   | Bash MCP       |
| Web research         | Web Search MCP |
| Cross-session memory | Memory MCP     |
| Progress to Slack    | Slack MCP      |

## Git Workflow (Phase 2)

1. Check if branch `linear/{issue-id}` already exists
2. If yes: checkout and pull
3. If no: create from `dev` branch
4. All commits go to this branch
5. PR targets `dev` branch (configurable)
6. PR title: `[linear/{issue-id}] <task summary>`
7. PR body: generated from the Buddy run summary
