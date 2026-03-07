#!/usr/bin/env node
/**
 * Buddy Git Operations
 * Handles branch management, commits, and push for the Buddy orchestrator.
 *
 * Usage:
 *   node scripts/git-ops.js setup --issue-id LIN-123 --base dev
 *   node scripts/git-ops.js check-branch --issue-id LIN-123
 *   node scripts/git-ops.js commit --message "LIN-123: Add auth endpoint"
 *   node scripts/git-ops.js push
 *   node scripts/git-ops.js info
 */

const { execSync } = require('child_process');
const path = require('path');

// ── Helpers ───────────────────────────────────────────────────────────────────

function git(cmd, opts = {}) {
    try {
        return execSync(`git ${cmd}`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            ...opts,
        }).trim();
    } catch (err) {
        const stderr = err.stderr ? err.stderr.trim() : err.message;
        throw new Error(stderr);
    }
}

function branchName(issueId) {
    return `linear/${issueId}`;
}

function currentBranch() {
    return git('branch --show-current');
}

function branchExists(name) {
    try {
        git(`rev-parse --verify ${name}`);
        return true;
    } catch {
        return false;
    }
}

function remoteBranchExists(name) {
    try {
        git(`rev-parse --verify origin/${name}`);
        return true;
    } catch {
        // Try fetching first
        try {
            git('fetch origin --prune');
            git(`rev-parse --verify origin/${name}`);
            return true;
        } catch {
            return false;
        }
    }
}

function isClean() {
    const status = git('status --porcelain');
    return status === '';
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

// ── Commands ──────────────────────────────────────────────────────────────────

function cmdSetup(args) {
    const issueId = args['issue-id'];
    const base = args.base || 'dev';

    if (!issueId) {
        console.error('Error: --issue-id is required');
        process.exit(1);
    }

    const branch = branchName(issueId);

    // Check if branch already exists locally
    if (branchExists(branch)) {
        git(`checkout ${branch}`);
        // Try to pull latest
        try {
            git(`pull origin ${branch}`);
        } catch {
            // Remote may not exist yet, that's ok
        }
        console.log(JSON.stringify({
            action: 'checked-out',
            branch,
            issue_id: issueId,
            message: `Branch ${branch} already exists. Checked out.`,
        }));
        return;
    }

    // Check if branch exists on remote
    if (remoteBranchExists(branch)) {
        git(`checkout -b ${branch} origin/${branch}`);
        console.log(JSON.stringify({
            action: 'checked-out-remote',
            branch,
            issue_id: issueId,
            message: `Branch ${branch} found on remote. Checked out.`,
        }));
        return;
    }

    // Make sure base branch exists and is up to date
    try {
        git(`fetch origin ${base}`);
    } catch {
        // If fetch fails, base might only be local
    }

    // Create new branch from base
    const baseRef = branchExists(`origin/${base}`) ? `origin/${base}` : base;
    git(`checkout -b ${branch} ${baseRef}`);

    console.log(JSON.stringify({
        action: 'created',
        branch,
        base,
        issue_id: issueId,
        message: `Created branch ${branch} from ${base}.`,
    }));
}

function cmdCheckBranch(args) {
    const issueId = args['issue-id'];
    if (!issueId) {
        console.error('Error: --issue-id is required');
        process.exit(1);
    }

    const branch = branchName(issueId);
    console.log(JSON.stringify({
        branch,
        exists_local: branchExists(branch),
        exists_remote: remoteBranchExists(branch),
        current_branch: currentBranch(),
        is_clean: isClean(),
    }));
}

function cmdCommit(args) {
    const message = args.message;
    if (!message) {
        console.error('Error: --message is required');
        process.exit(1);
    }

    // Stage all changes (tracked + untracked)
    git('add -A');

    // Check if there's anything to commit
    if (isClean()) {
        console.log(JSON.stringify({
            action: 'no-changes',
            message: 'Nothing to commit, working tree clean.',
        }));
        return;
    }

    // Commit
    const commitOutput = git(`commit -m "${message.replace(/"/g, '\\"')}"`);

    // Get the commit hash
    const commitHash = git('rev-parse --short HEAD');

    console.log(JSON.stringify({
        action: 'committed',
        commit: commitHash,
        branch: currentBranch(),
        message,
        details: commitOutput,
    }));
}

function cmdPush(args) {
    const branch = currentBranch();
    const force = args.force ? '--force-with-lease' : '';

    try {
        const output = git(`push ${force} origin ${branch}`);
        console.log(JSON.stringify({
            action: 'pushed',
            branch,
            remote: 'origin',
            output: output || 'Push successful.',
        }));
    } catch (err) {
        // If upstream not set, push with -u
        try {
            const output = git(`push ${force} -u origin ${branch}`);
            console.log(JSON.stringify({
                action: 'pushed',
                branch,
                remote: 'origin',
                set_upstream: true,
                output: output || 'Push successful (upstream set).',
            }));
        } catch (err2) {
            console.log(JSON.stringify({
                action: 'push-failed',
                branch,
                error: err2.message,
            }));
            process.exit(1);
        }
    }
}

function cmdInfo() {
    let remote = '';
    try {
        remote = git('remote get-url origin');
    } catch {
        remote = '(no remote configured)';
    }

    const branch = currentBranch();
    const lastCommit = git('log -1 --oneline');
    const status = git('status --short');

    console.log(JSON.stringify({
        branch,
        remote,
        last_commit: lastCommit,
        is_clean: status === '',
        uncommitted_changes: status ? status.split('\n').length : 0,
        status_detail: status || 'Clean',
    }));
}

// ── Main ──────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv);
const command = args._command;

switch (command) {
    case 'setup': cmdSetup(args); break;
    case 'check-branch': cmdCheckBranch(args); break;
    case 'commit': cmdCommit(args); break;
    case 'push': cmdPush(args); break;
    case 'info': cmdInfo(); break;
    default:
        console.error(`Unknown command: ${command || '(none)'}`);
        console.error('Available: setup | check-branch | commit | push | info');
        process.exit(1);
}
