import { fileURLToPath } from 'node:url';

export function isValidatorMain(importMetaUrl) {
  return process.argv[1] === fileURLToPath(importMetaUrl);
}

export function emitJson(ok, errors = [], warnings = []) {
  console.log(
    JSON.stringify({
      ok,
      errors,
      warnings,
      findings: errors.map((message) => ({ severity: 'error', message }))
    })
  );
}

export function isJsonMode(args) {
  return Boolean(args.json);
}

/** Finish a validator CLI run with consistent JSON/text output and exit code. */
export function finishValidatorRun({ ok, errors = [], warnings = [], jsonMode, successMessage, failureMessage }) {
  if (!ok) {
    if (jsonMode) emitJson(false, errors, warnings);
    else console.log(failureMessage || `\nFAILED - ${errors.length} validation error(s).`);
    process.exit(1);
  }
  if (jsonMode) emitJson(true, [], warnings);
  else if (successMessage) console.log(successMessage);
}
