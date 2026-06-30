#!/usr/bin/env node
import { validateUntrustedContent } from './lib/untrusted-content-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { runValidatorMain, validatorOptionsFromArgs } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-untrusted-content.mjs [options]

Options:
  --path <path>       Scan an explicit file or folder. May be repeated or comma-separated.
  --strict            Exit non-zero when prompt-injection-like content is found.
  --json              Print machine-readable JSON.
  --allow-missing     Ignore missing configured or explicit paths.
  --help              Show this help

Scans requirement intake and QA context files for prompt-injection-like instructions.
Findings are warnings by default and failures with --strict.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const options = {
    ...validatorOptionsFromArgs(args),
    path: args.path
  };
  const result = await validateUntrustedContent(process.cwd(), options);

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          strict: result.strict,
          scannedFiles: result.scannedFiles,
          missing: result.missing,
          findings: result.findings
        },
        null,
        2
      )
    );
    if (!result.ok) process.exit(1);
    return;
  }

  logHeader(`Untrusted content scan${options.strict ? ' --strict' : ''}`);
  for (const item of result.blockingMissing || []) {
    console.log(`[FAIL] ${item.path}: ${item.reason}`);
  }
  const blockingSet = new Set(result.blockingMissing || []);
  for (const item of (result.missing || []).filter((entry) => !blockingSet.has(entry))) {
    console.log(`[WARN] ${item.path}: ${item.reason}`);
  }
  for (const finding of result.findings || []) {
    console.log(
      `[${options.strict ? 'FAIL' : 'WARN'}] ${finding.file}:${finding.line} (${finding.pattern}) ${finding.excerpt}`
    );
  }

  console.log('\nResult:');
  if (!result.ok) {
    if ((result.blockingMissing || []).length > 0) {
      console.log(`FAILED - ${result.blockingMissing.length} missing path(s).`);
    } else {
      console.log(`FAILED - ${(result.findings || []).length} prompt-injection-like finding(s).`);
    }
    process.exit(1);
  }
  if ((result.findings || []).length > 0) {
    console.log(`VALID WITH WARNINGS - ${result.findings.length} prompt-injection-like finding(s).`);
  } else {
    console.log(
      `VALID - scanned ${(result.scannedFiles || []).length} file(s), no prompt-injection-like content found.`
    );
  }
}

runValidatorMain(import.meta.url, main);
