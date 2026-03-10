#!/usr/bin/env node
/**
 * Buddy State Manager
 * Manages orchestrator run state in .buddy/state.json
 *
 * Usage:
 *   node scripts/state.js init --task "task description"
 *   node scripts/state.js update --step analyzer --status done --output '{"key":"val"}'
 *   node scripts/state.js get
 *   node scripts/state.js get --field task
 *   node scripts/state.js get --step analyzer
 *   node scripts/state.js resume
 *   node scripts/state.js complete
 *   node scripts/state.js fail --reason "something went wrong"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Config ────────────────────────────────────────────────────────────────────
const STATE_DIR = path.join(process.cwd(), '.buddy');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

// ── Steps in order ────────────────────────────────────────────────────────────
const STEPS = [
  'initialize-branch',
  'analyzer',
  'prompt-enhancer',
  'researcher',
  'planner',
  'plan-verifier',      // NEW: 8-dimension plan verification
  'developer',
  'verifier',           // NEW: Goal-backward code verification
  'task-commit',        // NEW: Per-task atomic commit (separate from final git-agent/PR step)
  'code-reviewer',
  'integration-checker', // NEW: Cross-component wiring verification
  'tester',
  'lint-and-fix',
  'git-agent',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function ensureDir() {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(state) {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else if (!args._command) {
      args._command = arg;
    }
  }
  return args;
}

function id() {
  return `run_${crypto.randomBytes(4).toString('hex')}`;
}

function now() {
  return new Date().toISOString();
}

// ── Commands ──────────────────────────────────────────────────────────────────

function cmdInit(args) {
  const task = args.task;
  if (!task) {
    console.error('Error: --task is required');
    process.exit(1);
  }

  const existing = readState();
  if (existing && existing.status === 'running' && !args.force) {
    console.log(
      JSON.stringify({
        action: 'resumed',
        run_id: existing.run_id,
        message: 'Active run found. Use `resume` command or provide --force to override.',
      })
    );
    return;
  }

  const state = {
    run_id: id(),
    task,
    linear_issue_id: args['issue-id'] || null,
    branch: args.branch || null,
    status: 'running',
    current_step: 'initialize-branch',
    current_task: null,        // NEW: Track current task within step
    iteration: 1,
    max_iterations: 10,
    started_at: now(),
    updated_at: now(),
    steps: {},
    // NEW: Task-level tracking
    tasks: {},
    // NEW: Verification results
    verification: {
      plan_status: null,
      code_status: null,
      integration_status: null,
    },
    // NEW: Commit tracking for atomic commits
    commits: [],
    // NEW: Deviations tracking
    deviations: [],
  };

  // Initialize all steps as pending
  for (const step of STEPS) {
    state.steps[step] = { status: 'pending', output: null, updated_at: null };
  }

  writeState(state);
  console.log(JSON.stringify({ action: 'initialized', run_id: state.run_id, task, linear_issue_id: state.linear_issue_id, branch: state.branch }));
}

function cmdUpdate(args) {
  const state = readState();
  if (!state) {
    console.error('Error: No active run. Run `init` first.');
    process.exit(1);
  }

  const { step, status, output } = args;
  if (!step || !status) {
    console.error('Error: --step and --status are required');
    process.exit(1);
  }

  // Parse output if it looks like JSON
  let parsedOutput = output || null;
  if (parsedOutput && parsedOutput.startsWith('{') || parsedOutput && parsedOutput.startsWith('[')) {
    try {
      parsedOutput = JSON.parse(parsedOutput);
    } catch {
      // keep as string
    }
  }

  state.steps[step] = {
    status,
    output: parsedOutput,
    updated_at: now(),
  };

  // Advance current step only for known ordered steps.
  const stepIdx = STEPS.indexOf(step);
  if (status === 'done' && stepIdx !== -1 && stepIdx < STEPS.length - 1) {
    state.current_step = STEPS[stepIdx + 1];
  } else if (status === 'done' && stepIdx === STEPS.length - 1) {
    state.current_step = 'complete';
  } else if (status === 'needs-revision') {
    // Stay on or go back to previous step
    state.current_step = step;
    state.iteration += 1;
  }

  state.updated_at = now();
  writeState(state);

  console.log(JSON.stringify({ action: 'updated', step, status, current_step: state.current_step }));
}

function cmdGet(args) {
  const state = readState();
  if (!state) {
    console.log(JSON.stringify({ error: 'No state found. Run `init` to start.' }));
    return;
  }

  if (args.field) {
    console.log(JSON.stringify({ field: args.field, value: state[args.field] ?? null }));
  } else if (args.step) {
    const step = state.steps[args.step];
    console.log(JSON.stringify(step ?? { error: `Unknown step: ${args.step}` }));
  } else {
    console.log(JSON.stringify(state));
  }
}

function cmdResume(args) {
  const state = readState();
  if (!state) {
    console.log(JSON.stringify({ error: 'No state file found. Start a new run with `init`.' }));
    return;
  }
  if (state.status === 'complete') {
    console.log(JSON.stringify({ message: 'Last run is already complete.', run_id: state.run_id }));
    return;
  }

  console.log(
    JSON.stringify({
      action: 'resuming',
      run_id: state.run_id,
      task: state.task,
      current_step: state.current_step,
      iteration: state.iteration,
      completed_steps: Object.entries(state.steps)
        .filter(([, v]) => v.status === 'done')
        .map(([k]) => k),
    })
  );
}

function cmdComplete() {
  const state = readState();
  if (!state) {
    console.error('Error: No active run.');
    process.exit(1);
  }
  state.status = 'complete';
  state.current_step = 'complete';
  state.completed_at = now();
  state.updated_at = now();
  writeState(state);
  console.log(JSON.stringify({ action: 'complete', run_id: state.run_id }));
}

function cmdFail(args) {
  const state = readState();
  if (!state) {
    console.error('Error: No active run.');
    process.exit(1);
  }
  state.status = 'failed';
  state.failure_reason = args.reason || 'Unknown reason';
  state.failed_at = now();
  state.updated_at = now();
  writeState(state);
  console.log(JSON.stringify({ action: 'failed', run_id: state.run_id, reason: state.failure_reason }));
}

// ── NEW: Task-level commands ─────────────────────────────────────────────────────

function cmdBeginTask(args) {
  const state = readState();
  if (!state) {
    console.error('Error: No active run.');
    process.exit(1);
  }

  const taskId = args.task;
  if (!taskId) {
    console.error('Error: --task is required (e.g., task-1)');
    process.exit(1);
  }

  state.current_task = taskId;
  state.tasks[taskId] = state.tasks[taskId] || {
    status: 'in_progress',
    started_at: now(),
    commit: null,
    verified: null,
    verification_score: null,
    deviations: [],
  };
  state.updated_at = now();
  writeState(state);

  console.log(JSON.stringify({ action: 'task_begin', task_id: taskId }));
}

function cmdCompleteTask(args) {
  const state = readState();
  if (!state) {
    console.error('Error: No active run.');
    process.exit(1);
  }

  const taskId = args.task;
  if (!taskId) {
    console.error('Error: --task is required');
    process.exit(1);
  }

  if (!state.tasks[taskId]) {
    console.error(`Error: Task ${taskId} not found. Use begin-task first.`);
    process.exit(1);
  }

  state.tasks[taskId].status = 'done';
  state.tasks[taskId].completed_at = now();
  if (args.commit) {
    state.tasks[taskId].commit = args.commit;
    state.commits.push(args.commit);
  }
  if (args.verified) {
    state.tasks[taskId].verified = args.verified === 'true';
  }
  if (args.score) {
    state.tasks[taskId].verification_score = parseInt(args.score, 10);
  }
  state.current_task = null;
  state.updated_at = now();
  writeState(state);

  console.log(JSON.stringify({
    action: 'task_complete',
    task_id: taskId,
    commit: state.tasks[taskId].commit,
    verified: state.tasks[taskId].verified
  }));
}

function cmdAddCommit(args) {
  const state = readState();
  if (!state) {
    console.error('Error: No active run.');
    process.exit(1);
  }

  const hash = args.hash;
  if (!hash) {
    console.error('Error: --hash is required');
    process.exit(1);
  }

  state.commits.push(hash);
  state.updated_at = now();
  writeState(state);

  console.log(JSON.stringify({ action: 'commit_added', hash, total: state.commits.length }));
}

function cmdAddDeviation(args) {
  const state = readState();
  if (!state) {
    console.error('Error: No active run.');
    process.exit(1);
  }

  const deviation = {
    task: args.task || state.current_task,
    rule: args.rule ? parseInt(args.rule, 10) : null,
    type: args.type || 'unknown',
    found: args.found || '',
    fixed: args.fixed || '',
    files: args.files ? args.files.split(',') : [],
    timestamp: now(),
  };

  state.deviations.push(deviation);
  if (state.current_task && state.tasks[state.current_task]) {
    state.tasks[state.current_task].deviations.push(deviation);
  }
  state.updated_at = now();
  writeState(state);

  console.log(JSON.stringify({ action: 'deviation_added', deviation }));
}

function cmdUpdateVerification(args) {
  const state = readState();
  if (!state) {
    console.error('Error: No active run.');
    process.exit(1);
  }

  const type = args.type; // plan, code, or integration
  if (!type || !['plan', 'code', 'integration'].includes(type)) {
    console.error('Error: --type must be plan, code, or integration');
    process.exit(1);
  }

  const key = `${type}_status`;
  state.verification[key] = args.status || 'pending';
  if (args.score) {
    state.verification[`${type}_score`] = parseInt(args.score, 10);
  }
  state.updated_at = now();
  writeState(state);

  console.log(JSON.stringify({ action: 'verification_updated', type, status: state.verification[key] }));
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv);
const command = args._command;

switch (command) {
  case 'init': cmdInit(args); break;
  case 'update': cmdUpdate(args); break;
  case 'get': cmdGet(args); break;
  case 'resume': cmdResume(args); break;
  case 'complete': cmdComplete(); break;
  case 'fail': cmdFail(args); break;
  // NEW: Task-level commands
  case 'begin-task': cmdBeginTask(args); break;
  case 'complete-task': cmdCompleteTask(args); break;
  case 'add-commit': cmdAddCommit(args); break;
  case 'add-deviation': cmdAddDeviation(args); break;
  case 'update-verification': cmdUpdateVerification(args); break;
  default:
    console.error(`Unknown command: ${command || '(none)'}`);
    console.error('Available: init | update | get | resume | complete | fail | begin-task | complete-task | add-commit | add-deviation | update-verification');
    process.exit(1);
}
