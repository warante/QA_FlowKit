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
