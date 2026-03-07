#!/usr/bin/env node
/**
 * Buddy Progress Reporter
 * Renders a formatted progress table to stdout.
 *
 * Usage:
 *   node scripts/progress.js show
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.cwd(), '.buddy', 'state.json');

const STEP_LABELS = {
    'analyzer': 'Analyze Task',
    'prompt-enhancer': 'Enhance Prompt',
    'researcher': 'Research',
    'planner': 'Plan',
    'plan-reviewer': 'Review Plan',
    'developer': 'Develop',
    'tester': 'Test',
    'code-reviewer': 'Review Code',
};

const STATUS_ICON = {
    'done': '✅',
    'running': '🔄',
    'pending': '⬚ ',
    'needs-revision': '🔁',
    'failed': '❌',
    'skipped': '⏭ ',
};

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
};

function color(str, codes) {
    // Check if terminal supports color
    if (!process.stdout.isTTY && !process.env.FORCE_COLOR) return str;
    return codes + str + c.reset;
}

function pad(str, len) {
    const plain = str.replace(/\x1b\[[0-9;]*m/g, '');
    return str + ' '.repeat(Math.max(0, len - plain.length));
}

function elapsedStr(startedAt) {
    if (!startedAt) return '--';
    const ms = Date.now() - new Date(startedAt).getTime();
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ${secs % 60}s`;
}

function stepDurationStr(step) {
    if (!step || !step.updated_at || step.status === 'pending') return '--';
    return '✓';
}

// ── Banner ────────────────────────────────────────────────────────────────────
function printBanner(state) {
    const bannerFile = path.join(__dirname, '..', 'assets', 'buddy-banner.txt');
    if (fs.existsSync(bannerFile)) {
        console.log(color(fs.readFileSync(bannerFile, 'utf8'), c.cyan));
    }

    const line = '─'.repeat(50);
    console.log(color(`\n${line}`, c.gray));
    console.log(`  ${color('🤖 BUDDY', c.bold + c.cyan)} ${color(`Run: ${state.run_id}`, c.gray)}`);
    console.log(`  ${color('Task:', c.bold)} ${state.task}`);
    if (state.linear_issue_id || state.branch) {
        const parts = [];
        if (state.linear_issue_id) parts.push(`${color('Issue:', c.gray)} ${color(state.linear_issue_id, c.yellow)}`);
        if (state.branch) parts.push(`${color('Branch:', c.gray)} ${color(state.branch, c.cyan)}`);
        console.log(`  ${parts.join(`  ${color('│', c.gray)}  `)}`);
    }
    console.log(color(`${line}\n`, c.gray));
}

// ── Progress Table ────────────────────────────────────────────────────────────
function printProgress(state) {
    const steps = state.steps || {};
    const currentStep = state.current_step;

    // Header
    const col1 = 22, col2 = 14;
    console.log(
        color(pad('  Step', col1), c.bold + c.white) +
        color(pad('Status', col2), c.bold + c.white) +
        color('Notes', c.bold + c.white)
    );
    console.log(color('  ' + '─'.repeat(50), c.gray));

    // Rows
    for (const [key, label] of Object.entries(STEP_LABELS)) {
        const step = steps[key] || { status: 'pending' };
        const isCurrent = currentStep === key;

        const icon = isCurrent && step.status === 'pending'
            ? STATUS_ICON['running']
            : (STATUS_ICON[step.status] || '⬚ ');

        let statusText = step.status || 'pending';
        let statusColor = c.gray;
        if (step.status === 'done') statusColor = c.green;
        else if (step.status === 'failed') statusColor = c.red;
        else if (step.status === 'needs-revision') statusColor = c.yellow;
        else if (isCurrent) statusColor = c.cyan;

        const rowColor = isCurrent ? c.white : (step.status === 'done' ? c.gray : c.gray);

        const labelStr = isCurrent
            ? color(`  ${icon} ${label}`, c.bold + c.white)
            : `  ${icon} ${color(label, rowColor)}`;

        const statusStr = color(statusText, statusColor);

        const notes = step.status === 'needs-revision'
            ? color('↩ revision requested', c.yellow)
            : (step.status === 'done' ? color('complete', c.green + c.dim) : '');

        console.log(pad(labelStr, col1 + 4) + pad(statusStr, col2 + 9) + notes);
    }

    // Footer
    const elapsed = elapsedStr(state.started_at);
    const iteration = state.iteration || 1;
    const maxIter = state.max_iterations || 10;

    console.log(color('\n  ' + '─'.repeat(50), c.gray));

    if (state.status === 'complete') {
        console.log(`  ${color('✅ Task Complete!', c.bold + c.green)}`);
    } else if (state.status === 'failed') {
        console.log(`  ${color('❌ Task Failed:', c.bold + c.red)} ${state.failure_reason || ''}`);
    } else {
        console.log(
            `  ${color('Iteration:', c.gray)} ${color(`${iteration}/${maxIter}`, c.white)}` +
            `  ${color('│', c.gray)}  ` +
            `${color('Elapsed:', c.gray)} ${color(elapsed, c.white)}`
        );
    }
    console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────
const command = process.argv[2];

if (command !== 'show') {
    console.error('Usage: node scripts/progress.js show');
    process.exit(1);
}

if (!fs.existsSync(STATE_FILE)) {
    console.log('\n  🤖 BUDDY — No active run found.\n');
    process.exit(0);
}

let state;
try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
} catch {
    console.error('Error reading state file.');
    process.exit(1);
}

printBanner(state);
printProgress(state);
