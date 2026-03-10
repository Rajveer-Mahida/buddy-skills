# Buddy Skills Enhancement Summary

**Date:** 2026-03-10
**Inspired by:** Groovy Skills patterns

---

## Overview

Enhanced the Buddy multi-agent orchestrator with comprehensive verification, atomic commits, iterative improvement loops, persistent project documentation, and automatic activity tracking.

---

## New Agents Created

### 1. Codebase Mapper (`agents/codebase-mapper/SKILL.md`) ⭐ NEW
**Purpose:** Creates and maintains persistent project documentation

**Documentation Files Created:**
- `ARCHITECTURE.md` - Project structure, tech stack, key decisions, data flow
- `CODING_STANDARDS.md` - Naming conventions, code style, patterns to follow
- `CODEBASE_MAP.md` - File relationships, API routes, component hierarchy

**Workflow Integration:**
- Runs as **Step -1** (before analysis)
- Skipped if docs exist and are recent (within 7 days)
- Developer agent reads these files before writing code

### 2. Linear Watcher (`agents/linear-watcher/SKILL.md`) ⭐ NEW
**Purpose:** Continuous monitoring of Linear issues via MCP

**Features:**
- Uses Linear MCP tools (no direct API calls)
- Tracks seen issues in `.buddy/watcher-state.json`
- Two modes: Prompt (ask user) or Auto (work through all)
- Runs within agent context (not a background daemon)

### 3. Plan Verifier (`agents/plan-verifier/SKILL.md`)
**Purpose:** 8-dimension goal-backward plan verification before execution

**Verification Dimensions:**
1. Requirement Coverage - Every criterion has implementing tasks
2. Task Completeness - All tasks have files, action, verify
3. Dependency Correctness - No cycles, valid references
4. Key Links Planned - Artifacts wired, not just created
5. Scope Sanity - Within context budget
6. Verification Derivation - Tests trace to criteria
7. Context Compliance - Follows project conventions
8. Risk Mitigation - Risks identified with mitigations

### 2. Verifier (`agents/verifier/SKILL.md`)
**Purpose:** Goal-backward code verification after each task

**Three-Level Verification:**
1. **Exists** - File is present
2. **Substantive** - Not a stub/placeholder (min line thresholds)
3. **Wired** - Imported and used

**Stub Detection Patterns:**
- `<div>Placeholder</div>`
- `return null` or `return <></>`
- `// TODO` comments
- Empty handlers: `onClick={() => {}}`
- Console.log only implementations

### 3. Integration Checker (`agents/integration-checker/SKILL.md`)
**Purpose:** Cross-component wiring verification

**Checks:**
- Export/import mapping
- API route coverage (routes have consumers)
- Auth protection verification
- E2E flow tracing (form→API→DB→display)

---

## Enhanced Agents

### Developer (`agents/developer/SKILL.md`)
**New Features:**
- **Deviation Handling Rules:**
  - Rule 1: Auto-fix bugs
  - Rule 2: Auto-add missing critical functionality
  - Rule 3: Auto-fix blocking issues
  - Rule 4: STOP + ask user for architectural changes
- **Atomic Commit Protocol:** Stage files individually, commit per task
- **TDD Execution Pattern:** RED-GREEN-REFACTOR with per-phase commits

### Git Agent (`agents/git-agent/SKILL.md`)
**New Features:**
- **Per-task atomic commits** (moved from bulk commit at end)
- **Semantic commit types:** feat, fix, test, refactor, chore
- **Commit message template** with Co-Authored-By
- **Enhanced PR body** with verification results, deviations, commit list

### Reviewer (`agents/reviewer/SKILL.md`)
**New Features:**
- **Dimensional review criteria** (12 dimensions for code, 6 for plan)
- **Goal-backward verification** methodology
- **Structured issues** with severity levels
- **Dimensional scoring** with average calculation

### Planner (`agents/planner/SKILL.md`)
**New Features:**
- **must_haves derivation:** truths → artifacts → key_links
- **Verification commands** for each step
- **Commit hints** per step (semantic type suggestions)

---

## Updated Scripts

### State Manager (`scripts/state.js`)
**New Fields:**
- `current_task` - Track current task within step
- `tasks` - Task-level tracking (status, commit, verified, score)
- `verification` - Plan/code/integration verification results
- `commits` - List of commit hashes
- `deviations` - Deviation tracking

**New Commands:**
- `begin-task` - Start tracking a task
- `complete-task` - Mark task done with commit and score
- `add-commit` - Record a commit hash
- `add-deviation` - Track deviation taken
- `update-verification` - Update verification status

### Progress Reporter (`scripts/progress.js`)
**New Features:**
- Task-level progress display
- Commit hash display
- Verification scores display
- Deviation count display

---

## New Workflow Structure

### Phase 1: Preparation
1. Initialize Branch
2. Analyze Task
3. Enhance Prompt
4. Research
5. Create Plan
6. **Verify Plan (NEW)** → Loop 1: Plan Revision (max 3)

### Phase 2: Execution Loop (Per Task)
For each task:
1. **Develop Task** (with deviation rules)
2. **Verify Task (NEW)** → Loop 2: Task Fix (max 2)
3. **Atomic Commit (NEW)** - Per task
4. **Review Task** → Loop 3: Code Revision (max 2)

### Phase 3: Integration & Finalization
1. **Integration Check (NEW)** → Loop 4: Gap Closure (max 2)
2. Run Tests
3. Lint & Fix
4. **Create PR** (all commits already done)

---

## Iteration Loops

| Loop | Trigger | Max Iterations | Return To |
|------|---------|----------------|-----------|
| Plan Revision | Plan score < 7 | 3 | Planner |
| Task Fix | Verification fails | 2 | Developer |
| Code Revision | Review score < 7 | 2 | Developer |
| Gap Closure | Integration gaps | 2 | Developer (targeted) |

---

## File Changes Summary

**Created:**
- `agents/codebase-mapper/SKILL.md` - Persistent project documentation agent ⭐ NEW
- `agents/linear-watcher/SKILL.md` - Continuous Linear monitoring via MCP ⭐ NEW
- `agents/plan-verifier/SKILL.md` - 8-dimension plan verification
- `agents/verifier/SKILL.md` - Goal-backward code verification
- `agents/integration-checker/SKILL.md` - Cross-component wiring verification
- `AGENTS.md` - Auto-updated activity log ⭐ NEW

**Modified:**
- `SKILL.md` - Main orchestrator workflow with Step -1 (Codebase Mapper)
- `scripts/state.js` - Task-level tracking
- `scripts/progress.js` - Task progress display
- `agents/developer/SKILL.md` - Deviation rules + AGENTS.md auto-update ⭐ NEW
- `agents/git-agent/SKILL.md` - Atomic commits
- `agents/reviewer/SKILL.md` - Dimensional review
- `agents/planner/SKILL.md` - must_haves derivation

---

## Key Improvements

1. **Persistent Documentation:** `ARCHITECTURE.md`, `CODING_STANDARDS.md`, `CODEBASE_MAP.md` created and maintained ⭐ NEW
2. **Auto Activity Tracking:** `AGENTS.md` automatically updated with each change ⭐ NEW
3. **Linear Integration:** Continuous monitoring via MCP tools ⭐ NEW
4. **Verification-Driven:** Plans and code are verified before proceeding
5. **Atomic Commits:** One commit per task, not bulk at end
6. **Iterative Loops:** Multiple specific loops for different failure types
7. **Goal-Backward:** Start from observable truths, verify artifacts achieve them
8. **Deviation Handling:** Auto-fix common issues, ask for architectural changes
9. **State Tracking:** Task-level, verification, and commit tracking
10. **Enhanced PR:** Comprehensive PR body with verification results

---

## Usage

Invoke Buddy as before. The enhanced workflow will:

0. **Step -1:** Create/update project documentation (first time or when changed)
1. Verify plans before execution
2. Verify code after each task
3. Commit atomically per task
4. Update `AGENTS.md` with activity log ⭐ NEW
5. Review with dimensional criteria
6. Check integration before final testing
7. Create comprehensive PRs

No command-line changes needed - all enhancements are internal to the agents.
