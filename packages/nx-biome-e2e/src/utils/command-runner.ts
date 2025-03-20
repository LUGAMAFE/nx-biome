import { detectPackageManager, getPackageManagerCommand } from '@nx/devkit';
import { fileExists, runCommandAsync, tmpProjPath } from '@nx/plugin/testing';
import { resolve } from 'path';
import { isWin } from './project-setup';

/**
 * Run a nx command asynchronously inside the e2e directory
 * @param command The nx command to execute
 * @param opts Options for command execution
 * @returns A promise that resolves with the command output
 */
export function runNxCommandAsync(
  command: string,
  opts: { silenceError?: boolean; env?: NodeJS.ProcessEnv; cwd?: string } = {
    silenceError: false,
  }
) {
  const cwd = opts.cwd ?? tmpProjPath();
  if (fileExists(resolve(cwd, 'package.json'))) {
    const pmc = getPackageManagerCommand(detectPackageManager(cwd));
    return runCommandAsync(`${pmc.exec} nx ${command}`, opts);
  } else if (isWin) {
    return runCommandAsync(`./nx.bat %${command}`, opts);
  } else {
    return runCommandAsync(`./nx ${command}`, opts);
  }
}
