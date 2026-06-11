#!/usr/bin/env node
import { validateTestDesignProposal, validateTestDesignSystem } from './lib/test-design.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  resolveRepoPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-test-design.mjs [options]

Options:
  --system-path <file>   Override system test design path
  --proposal-path <file> Override per-RF proposal path
  --allow-missing        Return success when files are missing
  --require-rf-id        Fail when RF IDs are not mentioned in the proposal
  --help                 Show this help

Validates qa-ai-output/test-design-system.md and test-design-proposal.md structure.
`);
}

async function validateFile(cwd, filePath, validator, options = {}) {
  const absolute = resolveRepoPath(cwd, filePath, { label: 'test design file' });
  if (!(await pathExists(absolute))) {
    if (options.allowMissing) {
      return { ok: true, skipped: true, path: filePath, errors: [] };
    }
    return { ok: false, skipped: false, path: filePath, errors: [`Test design file not found: ${filePath}`] };
  }

  const content = await readText(absolute);
  const result = validator(content, options.validatorOptions || {});
  const errors = result.errors.map((error) => `${filePath}: ${error}`);
  return { ok: result.ok, skipped: false, path: filePath, errors };
}

export async function validateTestDesignArtifacts(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const systemPath =
    options.systemPath || getConfigValue(config, 'testDesign.systemPath', 'qa-ai-output/test-design-system.md');
  const proposalPath =
    options.proposalPath || getConfigValue(config, 'testDesign.proposalPath', 'qa-ai-output/test-design-proposal.md');

  const allowMissing = Boolean(options.allowMissing);
  const validatorOptions = {
    requireOfficialRfId: Boolean(options.requireRfId),
    requireCoverageSections:
      String(getConfigValue(config, 'testDesign.coverage.mode', 'off')).toLowerCase() === 'strict'
  };

  const system = await validateFile(cwd, systemPath, validateTestDesignSystem, {
    allowMissing,
    validatorOptions
  });
  const proposal = await validateFile(cwd, proposalPath, validateTestDesignProposal, {
    allowMissing,
    validatorOptions
  });

  const errors = [...system.errors, ...proposal.errors];
  return {
    ok: errors.length === 0,
    system,
    proposal,
    errors
  };
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA AI test design validator');
  const result = await validateTestDesignArtifacts(cwd, {
    systemPath: args['system-path'],
    proposalPath: args['proposal-path'],
    allowMissing: Boolean(args['allow-missing']),
    requireRfId: Boolean(args['require-rf-id'])
  });

  if (result.system.skipped) {
    console.log('SKIP - system test design file not found.');
  } else if (result.system.ok) {
    console.log(`PASS - ${result.system.path}`);
  }

  if (result.proposal.skipped) {
    console.log('SKIP - per-RF test design proposal not found.');
  } else if (result.proposal.ok) {
    console.log(`PASS - ${result.proposal.path}`);
  }

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`FAIL - ${error}`);
    }
    process.exit(1);
  }

  console.log('\nVALID - test design artifacts passed validation.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
