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
  'analyzer',
  'prompt-enhancer',
  'researcher',
  'planner',
  'plan-reviewer',
  'developer',
  'tester',
  'code-reviewer',
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
  if (existing && existing.status === 'running') {
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
    status: 'running',
    current_step: 'analyzer',
    iteration: 1,
    max_iterations: 10,
    started_at: now(),
    updated_at: now(),
    steps: {},
  };

  // Initialize all steps as pending
  for (const step of STEPS) {
    state.steps[step] = { status: 'pending', output: null, updated_at: null };
  }

  writeState(state);
  console.log(JSON.stringify({ action: 'initialized', run_id: state.run_id, task }));
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

  // Advance current step
  const stepIdx = STEPS.indexOf(step);
  if (status === 'done' && stepIdx < STEPS.length - 1) {
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

// ── Main ──────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv);
const command = args._command;

switch (command) {
  case 'init':    cmdInit(args); break;
  case 'update':  cmdUpdate(args); break;
  case 'get':     cmdGet(args); break;
  case 'resume':  cmdResume(args); break;
  case 'complete': cmdComplete(); break;
  case 'fail':    cmdFail(args); break;
  default:
    console.error(`Unknown command: ${command || '(none)'}`);
    console.error('Available: init | update | get | resume | complete | fail');
    process.exit(1);
}
