/**
 * Run a hook main() and exit with a non-zero code on unexpected failures.
 * Intentional early exits inside main (process.exit(0|2)) are unaffected.
 */
export function runHookMain(mainFn, hookName) {
  mainFn().catch((error) => {
    console.error(`${hookName} failed:`, error);
    process.exit(1);
  });
}
