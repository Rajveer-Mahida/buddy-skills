#!/usr/bin/env node
/**
 * Buddy Environment Checker
 * Validates that required tools are available before starting a run.
 *
 * Usage:
 *   node scripts/check-env.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const checks = [];
let hasErrors = false;

function check(name, fn) {
    try {
        const result = fn();
        checks.push({ name, status: 'ok', detail: result || '✓' });
    } catch (err) {
        hasErrors = true;
        checks.push({ name, status: 'error', detail: err.message });
    }
}

function warn(name, fn) {
    try {
        const result = fn();
        checks.push({ name, status: 'ok', detail: result || '✓' });
    } catch (err) {
        checks.push({ name, status: 'warning', detail: err.message });
    }
}

// ── Required ──────────────────────────────────────────────────────────────────
check('Node.js', () => {
    const v = process.version;
    const major = parseInt(v.slice(1));
    if (major < 18) throw new Error(`Node.js v18+ required, found ${v}`);
    return v;
});

check('Git', () => {
    return execSync('git --version', { encoding: 'utf8' }).trim();
});

check('Git repo', () => {
    execSync('git rev-parse --git-dir', { encoding: 'utf8', stdio: 'pipe' });
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    return `on branch: ${branch}`;
});

// ── Optional (MCP stubs — Phase 3) ───────────────────────────────────────────
warn('Linear MCP', () => {
    if (!process.env.LINEAR_API_KEY) throw new Error('LINEAR_API_KEY not set in .env (needed for Phase 2)');
    return 'LINEAR_API_KEY found';
});

warn('GitHub token', () => {
    if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN)
        throw new Error('GITHUB_TOKEN not set (needed for PR creation in Phase 2)');
    return 'GitHub token found';
});

warn('Web Search MCP (Brave)', () => {
    if (!process.env.BRAVE_API_KEY) throw new Error('BRAVE_API_KEY not set in .env (needed for Web Search in Phase 3)');
    return 'BRAVE_API_KEY found';
});

warn('Slack MCP', () => {
    if (!process.env.SLACK_BOT_TOKEN) throw new Error('SLACK_BOT_TOKEN not set in .env (needed for Phase 4)');
    return 'SLACK_BOT_TOKEN found';
});

warn('.env file', () => {
    const envFile = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envFile)) throw new Error('.env file not found in project root');
    return '.env found';
});

// ── Report ────────────────────────────────────────────────────────────────────
const icons = { ok: '✅', warning: '⚠️ ', error: '❌' };

console.log('\n🤖 Buddy — Environment Check\n');

for (const c of checks) {
    const icon = icons[c.status];
    const name = c.name.padEnd(20);
    console.log(`  ${icon} ${name} ${c.detail}`);
}

console.log('');

if (hasErrors) {
    console.log('❌ Fix the above errors before running Buddy.\n');
    process.exit(1);
} else {
    console.log('✅ Environment looks good!\n');
    process.exit(0);
}
