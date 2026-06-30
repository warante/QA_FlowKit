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
    else {
      for (const warning of warnings) console.log(`WARNING: ${warning}`);
      for (const error of errors) console.log(error);
      console.log(failureMessage || `\nFAILED - ${errors.length} validation error(s).`);
    }
    process.exit(1);
  }
  if (jsonMode) emitJson(true, [], warnings);
  else {
    for (const warning of warnings) console.log(`WARNING: ${warning}`);
    if (successMessage) console.log(successMessage);
  }
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
    console.error(error);
    process.exit(1);
  });
}
