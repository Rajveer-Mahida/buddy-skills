# Buddy Agents - Codebase Activity Log

This file is automatically maintained by the Buddy orchestrator. It tracks all agents used and changes made to the codebase.

---

## Last Updated

**Date:** {{DATE}}
**Run ID:** {{RUN_ID}}
**Linear Issue:** {{LINEAR_ISSUE}}
**Branch:** {{BRANCH}}

---

## Agent Registry

| Agent | Purpose | SKILL File | Last Used |
|-------|---------|------------|-----------|
| **Codebase Mapper** | Creates ARCHITECTURE.md, CODING_STANDARDS.md, CODEBASE_MAP.md | `agents/codebase-mapper/SKILL.md` | {{DATE}} |
| **Linear Watcher** | Continuous monitoring of Linear issues via MCP | `agents/linear-watcher/SKILL.md` | {{DATE}} |
| **Linear Reader** | Fetch and list Linear tasks | `agents/linear-reader/SKILL.md` | {{DATE}} |
| **Analyzer** | Task decomposition, classification, identifying affected files | `agents/analyzer/SKILL.md` | {{DATE}} |
| **Prompt Enhancer** | Build rich prompts from raw task descriptions | `agents/prompt-enhancer/SKILL.md` | {{DATE}} |
| **Researcher** | Codebase deep-dive and external documentation research | `agents/researcher/SKILL.md` | {{DATE}} |
| **Planner** | Create implementation plans with must_haves derivation | `agents/planner/SKILL.md` | {{DATE}} |
| **Plan Verifier** | 8-dimension goal-backward plan verification | `agents/plan-verifier/SKILL.md` | {{DATE}} |
| **Developer** | Code implementation with deviation handling rules | `agents/developer/SKILL.md` | {{DATE}} |
| **Verifier** | Goal-backward code verification (exists, substantive, wired) | `agents/verifier/SKILL.md` | {{DATE}} |
| **Code Reviewer** | Dimensional plan and code review with scoring | `agents/reviewer/SKILL.md` | {{DATE}} |
| **Integration Checker** | Cross-component wiring verification | `agents/integration-checker/SKILL.md` | {{DATE}} |
| **Tester** | Testing and validation with Playwright for UI tasks | `agents/tester/SKILL.md` | {{DATE}} |
| **Git Agent** | Branching, atomic commits, and PR creation | `agents/git-agent/SKILL.md` | {{DATE}} |

---

## Recent Activity Log

### Run: {{RUN_ID}} - {{TASK_SUMMARY}}
**Date:** {{DATE}}
**Issue:** {{LINEAR_ISSUE}}
**Branch:** {{BRANCH}}
**Status:** {{STATUS}}

#### Agents Used
{{AGENTS_USED_LIST}}

#### Files Changed
| File | Action | Agent | Commit |
|------|--------|-------|--------|
| {{FILE_PATH}} | {{CREATED/MODIFIED/DELETED}} | Developer | {{COMMIT_HASH}} |

#### Deviations Taken
{{DEVIATIONS_LIST}}

#### Verification Results
- Plan Score: {{PLAN_SCORE}}/10
- Code Score: {{CODE_SCORE}}/10
- Integration Score: {{INTEGRATION_SCORE}}/10

#### Pull Request
{{PR_URL}}

---

## Project Documentation Files

| File | Purpose | Last Updated |
|------|---------|--------------|
| `ARCHITECTURE.md` | Project structure, tech stack, key decisions | {{DATE}} |
| `CODING_STANDARDS.md` | Naming conventions, code style, patterns | {{DATE}} |
| `CODEBASE_MAP.md` | File relationships, API routes, component hierarchy | {{DATE}} |

---

## Workflow Summary

```
Step -1: Codebase Mapper → Creates/updates project documentation
    ↓
Step 0: Initialize & Branch Setup (Git Agent)
    ↓
Step 1: Analyzer → Task decomposition
    ↓
Step 2: Prompt Enhancer → Rich prompt building
    ↓
Step 3: Researcher → Codebase + external research
    ↓
Step 4: Planner → Implementation plan
    ↓
Step 5: Plan Verifier → 8-dimension verification (score ≥ 7 to pass)
    ↓ [Loop 1: Plan Revision, max 3]
Step 6a: Developer → Code implementation with deviation rules
    ↓
Step 6b: Verifier → Goal-backward code verification
    ↓ [Loop 2: Task Fix, max 2]
Step 6c: Atomic Commit → Per-task commit
    ↓
Step 6d: Code Reviewer → Dimensional review (score ≥ 7 to pass)
    ↓ [Loop 3: Code Revision, max 2]
    ↓ [Repeat 6a-6d for each task]
Step 7: Integration Checker → Cross-component wiring
    ↓ [Loop 4: Gap Closure, max 2]
Step 8: Tester → Testing + Playwright for UI
    ↓
Step 9: Lint & Fix (Git Agent)
    ↓
Step 10: Create PR (Git Agent)
    ↓
Step 11: Update Linear to Done
```

---

## Statistics

| Metric | Value |
|--------|-------|
| Total Runs | {{TOTAL_RUNS}} |
| Files Created | {{FILES_CREATED}} |
| Files Modified | {{FILES_MODIFIED}} |
| Commits Made | {{TOTAL_COMMITS}} |
| PRs Created | {{TOTAL_PRS}} |
| Avg Plan Score | {{AVG_PLAN_SCORE}}/10 |
| Avg Code Score | {{AVG_CODE_SCORE}}/10 |

---

## Notes

- This file is automatically updated by the Developer agent after each atomic commit
- Manual edits may be overwritten by the agent
- For project-specific documentation, see `ARCHITECTURE.md`, `CODING_STANDARDS.md`, and `CODEBASE_MAP.md`
