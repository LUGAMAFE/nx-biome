import {
  PackageManager,
  detectPackageManager,
  getPackageManagerCommand,
  joinPathFragments,
  readJsonFile,
  workspaceRoot,
} from '@nx/devkit';
import { fileExists, runCommand, tmpProjPath } from '@nx/plugin/testing';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { basename, dirname } from 'path';
import { PROJECT_NAMES } from './constants';

export { tmpProjPath };

/**
 * Detects if the operating system is Windows
 */
export const isWin = process.platform === 'win32';

/**
 * Creates a test project with create-nx-workspace and installs the plugin
 * If reuseExisting is true, it will try to reuse an existing project
 * @param projectName The name of the project to create
 * @param pkgManager The package manager to use
 * @param workspaceVersion The version of Nx to use (latest or local)
 * @param reuseExisting Whether to reuse an existing project if it exists
 * @returns The directory where the test project was created
 */
export function createTestProject(
  projectName = PROJECT_NAMES.TEST_PROJECT,
  pkgManager: PackageManager = detectPackageManager(),
  workspaceVersion: 'latest' | 'local' = 'latest',
  reuseExisting = false
) {
  const projectDirectory = tmpProjPath(projectName);
  const workspaceName = basename(projectDirectory);
  const workspaceParentDir = dirname(projectDirectory);

  // Check if project already exists and should be reused
  if (reuseExisting && existsSync(projectDirectory)) {
    console.log(`Reusing existing project at ${projectDirectory}`);

    const nodeModulesPath = joinPathFragments(projectDirectory, 'node_modules');
    const packageJsonPath = joinPathFragments(projectDirectory, 'package.json');
    const biomePath = joinPathFragments(
      projectDirectory,
      'node_modules',
      '@biomejs',
      'biome'
    );

    // Verify basic structure to make sure it's a valid project
    if (
      existsSync(nodeModulesPath) &&
      existsSync(packageJsonPath) &&
      existsSync(biomePath)
    ) {
      console.log(
        'Project structure valid, skipping creation and dependency installation'
      );
      return projectDirectory;
    }

    console.log(
      'Project exists but appears to be incomplete, recreating it...'
    );
  }

  // Remove existing project if we're not reusing it or it's invalid
  rmSync(projectDirectory, {
    recursive: true,
    force: true,
  });
  mkdirSync(workspaceParentDir, {
    recursive: true,
  });

  const nxVersion =
    workspaceVersion === 'local' ? readLocalNxWorkspaceVersion() : 'latest';
  const flags = getForceFlags(pkgManager);
  const command = `${
    getPackageManagerCommand(pkgManager).dlx
  } ${flags} create-nx-workspace@${nxVersion} ${workspaceName} --preset npm --nxCloud=skip --no-interactive --pm ${pkgManager} --verbose`;

  console.log(
    `Creating a sandbox project in '${projectDirectory}' with command: '${command}'...`
  );

  try {
    const output = runCommand(command, {
      cwd: workspaceParentDir,
    });
    console.log(`Output: ${output}`);
    return projectDirectory;
  } catch (e) {
    console.error(
      `Original command: ${command}`,
      `stdout: ${e.stdout}\n\nstderr: ${e.stderr}`
    );
    throw e;
  }
}

/**
 * Reads the local Nx workspace version from package.json
 * @returns The Nx version string
 */
export function readLocalNxWorkspaceVersion(): string {
  const pkgJsonPath = joinPathFragments(workspaceRoot, 'package.json');
  if (!fileExists(pkgJsonPath)) {
    throw new Error(
      'Could not find root package.json to determine dependency versions.'
    );
  }
  return readJsonFile(pkgJsonPath).devDependencies['nx'];
}

/**
 * Gets the appropriate flags for the package manager
 * @param packageManager The package manager to get flags for
 * @returns The flags as a string
 */
function getForceFlags(packageManager: PackageManager): string {
  switch (packageManager.toLowerCase()) {
    case 'npm':
    case 'npx':
      // Using full form of flags for better clarity
      return '--ignore-existing --yes';
    case 'yarn':
      // yarn doesn't need a no-prompt flag for dlx
      return '--prefer-offline=false';
    case 'pnpm':
      // Using full form of flags for better clarity
      return '--ignore-existing --yes';
    case 'bun':
      // bunx doesn't show prompts by default
      return '--force';
    default:
      throw new Error(`Unsupported package manager: ${packageManager}`);
  }
}
