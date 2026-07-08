#!/usr/bin/env node
/**
 * Safely executes QA test commands configured in qa-ai.config.yaml.
 * Uses spawnSync with shell:false. Only commands from config are allowed.
 */
import { spawnSync } from 'node:child_process';
import { getConfigValue, loadQaAiConfig, pathExists, readText, resolveRepoPath } from './lib/utils.mjs';

function findCommandConfig(commands, commandId) {
  if (!Array.isArray(commands)) return null;
  return commands.find((c) => c.id === commandId) || null;
}

function dryRunPlan(commands) {
  const plan = [];
  for (const cmd of commands || []) {
    plan.push({
      id: cmd.id,
      label: cmd.label || cmd.id,
      command: cmd.command,
      args: cmd.args || [],
      type: cmd.type || 'custom',
      required: cmd.required !== false,
      timeoutSeconds: cmd.timeoutSeconds || 300
    });
  }
  return plan;
}

async function executeCommands(config, cwd, options = {}) {
  const commands = getConfigValue(config, 'execution.commands', []);
  if (!Array.isArray(commands) || commands.length === 0) {
    return { ok: true, results: [], message: 'No execution commands configured.' };
  }

  if (options.dryRun) {
    return { ok: true, plan: dryRunPlan(commands), dryRun: true };
  }

  const planPath = options.planPath || getConfigValue(config, 'execution.planPath', '.qa-ai/output/execution-plan.md');
  let commandIds = options.commandIds || [];

  if (commandIds.length === 0 && planPath) {
    const planAbs = resolveRepoPath(cwd, planPath, { label: 'execution plan' });
    if (await pathExists(planAbs)) {
      const content = await readText(planAbs);
      commandIds = [];
      for (const line of content.split('\n')) {
        const match = line.match(/^\|\s*([a-z][a-z0-9-]*)\s*\|/);
        if (match && match[1]) commandIds.push(match[1]);
      }
    }
  }

  if (commandIds.length === 0) {
    commandIds = commands.filter((c) => c.required !== false).map((c) => c.id);
  }

  const results = [];
  let allPassed = true;

  for (const commandId of commandIds) {
    const cmdConfig = findCommandConfig(commands, commandId);
    if (!cmdConfig) {
      results.push({ id: commandId, status: 'blocked', error: `Command "${commandId}" not found in configuration.` });
      allPassed = false;
      continue;
    }

    const timeout = (cmdConfig.timeoutSeconds || 300) * 1000;
    const startTime = Date.now();

    try {
      const result = spawnSync(cmdConfig.command, cmdConfig.args || [], {
        cwd,
        shell: false,
        timeout,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      const duration = Date.now() - startTime;
      const exitCode = result.status ?? null;
      const signal = result.signal ?? null;

      let status = 'failed';
      if (exitCode === 0) status = 'passed';
      else if (signal === 'SIGTERM' || signal === 'SIGKILL') status = 'blocked';
      else if (exitCode === null && result.error) {
        if (result.error.code === 'ETIMEDOUT') status = 'blocked';
        else status = 'blocked';
      }

      if (status !== 'passed') allPassed = false;

      const stdout = result.stdout?.toString('utf-8')?.trim() || '';
      const stderr = result.stderr?.toString('utf-8')?.trim() || '';

      results.push({
        id: commandId,
        label: cmdConfig.label || commandId,
        status,
        exitCode,
        durationMs: duration,
        signal: signal || null,
        error: result.error?.message || null,
        stdoutExcerpt: stdout.slice(0, 500) || null,
        stderrExcerpt: stderr.slice(0, 500) || null,
        required: cmdConfig.required !== false
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      allPassed = false;
      results.push({
        id: commandId,
        label: cmdConfig.label || commandId,
        status: 'blocked',
        exitCode: null,
        durationMs: duration,
        error: err.message
      });
    }
  }

  return {
    ok: allPassed,
    results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.status === 'passed').length,
      failed: results.filter((r) => r.status === 'failed').length,
      blocked: results.filter((r) => r.status === 'blocked').length
    }
  };
}

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/execute.mjs [options]

Options:
  --json              Output machine-readable JSON
  --plan <path>       Override execution plan path
  --dry-run           Show plan without executing
  --id <id>           Execute only a specific command (repeatable)
  --help              Show this help
`);
}

function parseArgs(argv) {
  const args = { _: [], commandIds: [] };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help') args.help = true;
    else if (arg === '--plan') args.planPath = argv[++i];
    else if (arg === '--id') args.commandIds.push(argv[++i]);
    else if (!arg.startsWith('-')) args._.push(arg);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const cwd = process.cwd();
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const result = await executeCommands(config, cwd, {
    dryRun: args.dryRun,
    planPath: args.planPath,
    commandIds: args.commandIds
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.dryRun) {
    console.log('Execution plan (dry-run):');
    for (const cmd of result.plan || []) {
      console.log(`  ${cmd.id}: ${cmd.command} ${(cmd.args || []).join(' ')} [${cmd.type}]`);
    }
    console.log(`\n${result.plan?.length || 0} command(s) configured.`);
  } else {
    console.log(
      `\nExecution results: ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.blocked} blocked`
    );
    for (const r of result.results) {
      const icon = r.status === 'passed' ? 'PASS' : r.status === 'failed' ? 'FAIL' : 'BLOCK';
      console.log(`  [${icon}] ${r.label || r.id} (${r.durationMs}ms)`);
      if (r.error) console.log(`    Error: ${r.error}`);
    }
  }

  if (!result.dryRun && !result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
