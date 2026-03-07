#!/usr/bin/env node
/**
 * Buddy Skill Installer
 * Installs the Buddy skill into any supported agent's skills directory.
 *
 * Usage:
 *   node scripts/install-skill.js --agent all
 *   node scripts/install-skill.js --agent antigravity
 *   node scripts/install-skill.js --agent claude-code
 *   node scripts/install-skill.js --list
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const SKILL_NAME = 'buddy';
const SKILL_SOURCE = path.resolve(__dirname, '..');

// Agent → [project path, global path]
const AGENTS = {
    'antigravity': ['.agent/skills', path.join(HOME, '.gemini/antigravity/skills')],
    'claude-code': ['.claude/skills', path.join(HOME, '.claude/skills')],
    'codex': ['.agents/skills', path.join(HOME, '.agents/skills')],
    'cursor': ['.agents/skills', path.join(HOME, '.cursor/skills')],
    'opencode': ['.agents/skills', path.join(HOME, '.config/opencode/skills')],
    'gemini-cli': ['.agents/skills', path.join(HOME, '.gemini/skills')],
    'windsurf': ['.windsurf/skills', path.join(HOME, '.codeium/windsurf/skills')],
    'github-copilot': ['.agents/skills', path.join(HOME, '.copilot/skills')],
    'continue': ['.continue/skills', path.join(HOME, '.continue/skills')],
    'cline': ['.agents/skills', path.join(HOME, '.agents/skills')],
    'roo': ['.roo/skills', path.join(HOME, '.roo/skills')],
    'zencoder': ['.zencoder/skills', path.join(HOME, '.zencoder/skills')],
    'augment': ['.augment/skills', path.join(HOME, '.augment/skills')],
    'goose': ['.goose/skills', path.join(HOME, '.config/goose/skills')],
};

function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function installTo(destBase, label, scope) {
    const dest = path.join(destBase, SKILL_NAME);
    try {
        if (fs.existsSync(dest)) {
            // Remove old version
            fs.rmSync(dest, { recursive: true, force: true });
        }
        copyDirSync(SKILL_SOURCE, dest);
        console.log(`  ✅ ${label.padEnd(18)} → ${dest}`);
        return true;
    } catch (err) {
        console.log(`  ⚠️  ${label.padEnd(18)} → Failed: ${err.message}`);
        return false;
    }
}

const args = process.argv.slice(2);

if (args.includes('--list') || args.length === 0) {
    console.log('\n🤖 Buddy — Supported Agents\n');
    for (const [agent, [proj, global]] of Object.entries(AGENTS)) {
        console.log(`  ${agent.padEnd(18)} project: ${proj}, global: ${global}`);
    }
    console.log('\nUsage:');
    console.log('  node scripts/install-skill.js --agent all');
    console.log('  node scripts/install-skill.js --agent antigravity --scope global');
    console.log('  node scripts/install-skill.js --agent claude-code --scope project\n');
    process.exit(0);
}

const agentArg = (args[args.indexOf('--agent') + 1] || '').toLowerCase();
const scope = (args[args.indexOf('--scope') + 1] || 'both').toLowerCase(); // project | global | both

if (!agentArg) {
    console.error('Error: --agent <name|all> is required');
    process.exit(1);
}

const targets = agentArg === 'all' ? Object.entries(AGENTS) : ([[agentArg, AGENTS[agentArg]]]);

if (!AGENTS[agentArg] && agentArg !== 'all') {
    console.error(`Unknown agent: "${agentArg}". Run with --list to see available agents.`);
    process.exit(1);
}

console.log(`\n🤖 Installing Buddy skill (${SKILL_NAME})...\n`);

let installed = 0;
for (const [agent, [projectPath, globalPath]] of targets) {
    if (scope !== 'global') {
        const projectBase = path.join(process.cwd(), projectPath);
        if (installTo(projectBase, `${agent} (project)`, 'project')) installed++;
    }
    if (scope !== 'project') {
        if (installTo(globalPath, `${agent} (global)`, 'global')) installed++;
    }
}

console.log(`\n✅ Installed to ${installed} location(s).\n`);
console.log('💡 Tip: Say "Hey Buddy, check the tasks" in your agent to get started.\n');
