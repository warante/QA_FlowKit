import { fileURLToPath } from 'node:url';
import { redactValidatorDiagnostics } from './secret-patterns.mjs';

function sanitizeValidatorValue(value) {
  if (typeof value === 'string') return redactValidatorDiagnostics(value);
  if (Array.isArray(value)) return value.map(sanitizeValidatorValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValidatorValue(item)]));
  }
  return value;
}

export function isValidatorMain(importMetaUrl) {
  return process.argv[1] === fileURLToPath(importMetaUrl);
}

export function emitJson(ok, errors = [], warnings = [], extra = {}) {
  const safeErrors = sanitizeValidatorValue(errors);
  const safeWarnings = sanitizeValidatorValue(warnings);
  const safeExtra = sanitizeValidatorValue(extra);
  console.log(
    JSON.stringify({
      ...safeExtra,
      ok,
      errors: safeErrors,
      warnings: safeWarnings,
      findings: safeErrors.map((message) => ({ severity: 'error', message }))
    })
  );
}

export function emitFindingsJson({ ok, errors = [], warnings = [], findings, extra = {} }) {
  const resolvedFindings = findings || [
    ...errors.map((message) => ({ severity: 'error', message })),
    ...warnings.map((message) => ({ severity: 'warning', message }))
  ];
  console.log(JSON.stringify(sanitizeValidatorValue({ ...extra, ok, errors, warnings, findings: resolvedFindings })));
}

export function isJsonMode(args) {
  return Boolean(args.json);
}

/** Finish a validator CLI run with consistent JSON/text output and exit code. */
export function finishValidatorRun({
  ok,
  errors = [],
  warnings = [],
  jsonMode,
  successMessage,
  failureMessage,
  extraJson = {}
}) {
  if (!ok) {
    if (jsonMode) emitJson(false, errors, warnings, extraJson);
    else {
      for (const warning of warnings) console.log(`WARNING: ${redactValidatorDiagnostics(warning)}`);
      for (const error of errors) console.error(redactValidatorDiagnostics(error));
      console.log(redactValidatorDiagnostics(failureMessage || `\nFAILED - ${errors.length} validation error(s).`));
    }
    process.exit(1);
  }
  if (jsonMode) emitJson(true, [], warnings, extraJson);
  else {
    for (const warning of warnings) console.log(`WARNING: ${redactValidatorDiagnostics(warning)}`);
    if (successMessage) console.log(redactValidatorDiagnostics(successMessage));
  }
}

export function finishValidatorFindingsRun({
  ok,
  errors = [],
  warnings = [],
  findings,
  jsonMode,
  successMessage,
  failureMessage,
  extraJson = {}
}) {
  if (!ok) {
    if (jsonMode) {
      emitFindingsJson({ ok: false, errors, warnings, findings, extra: extraJson });
      process.exit(1);
    }
    for (const warning of warnings) console.log(`WARNING: ${redactValidatorDiagnostics(warning)}`);
    for (const error of errors) console.error(redactValidatorDiagnostics(error));
    console.log(redactValidatorDiagnostics(failureMessage || `\nFAILED - ${errors.length} validation error(s).`));
    process.exit(1);
  }
  if (jsonMode) {
    emitFindingsJson({ ok: true, errors: [], warnings, findings: findings || [], extra: extraJson });
    return;
  }
  for (const warning of warnings) console.log(`WARNING: ${redactValidatorDiagnostics(warning)}`);
  if (successMessage) console.log(redactValidatorDiagnostics(successMessage));
}

/** Map common CLI flags to validator options. */
export function validatorOptionsFromArgs(args) {
  return {
    path: args.path,
    file: args.file,
    allowEmpty: Boolean(args['allow-empty']),
    allowMissing: Boolean(args['allow-missing']),
    strict: Boolean(args.strict),
    gherkinLanguage: args['gherkin-language'] || args.gherkinLanguage || args.gherkin,
    strictTags: Boolean(args['strict-tags']),
    strictLayout: Boolean(args['strict-layout']),
    noDuplicates: Boolean(args['no-duplicates']),
    strictRf: Boolean(args['strict-rf']),
    configPath: args.config
  };
}

/** Handle framework-not-configured skip (Karate, Maestro, etc.). */
export function finishSkippedValidator({ jsonMode, message }) {
  if (jsonMode) emitJson(true);
  else if (message) console.log(message);
}

/** Run async validator entrypoint with standard error handling. */
export function runValidatorMain(importMetaUrl, main) {
  if (!isValidatorMain(importMetaUrl)) return;
  main().catch((error) => {
    const message = redactValidatorDiagnostics(error?.message || String(error));
    console.error(message);
    process.exit(1);
  });
}
