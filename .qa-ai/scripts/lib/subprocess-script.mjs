import { spawnSync } from 'node:child_process';

const DEFAULT_MAX_BUFFER = 1024 * 1024;

/**
 * Run a Node script via spawnSync(process.execPath, [scriptPath, ...args]).
 * scriptPath may be absolute or relative to cwd.
 */
export function runSubprocessScript(scriptPath, args = [], options = {}) {
  const {
    cwd,
    encoding = 'utf8',
    shell = false,
    env,
    maxBuffer = DEFAULT_MAX_BUFFER,
    timeout,
    stdio
  } = options;

  const spawnOptions = {
    cwd,
    encoding,
    shell,
    maxBuffer,
    ...(env !== undefined ? { env } : {}),
    ...(timeout !== undefined ? { timeout } : {}),
    ...(stdio !== undefined ? { stdio } : {})
  };

  const result = spawnSync(process.execPath, [scriptPath, ...args], spawnOptions);

  return {
    ok: (result.status ?? 1) === 0,
    exitCode: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error
  };
}
