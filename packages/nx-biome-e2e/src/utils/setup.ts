import { getPackageManagerCommand } from '@nx/devkit';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { runNxCommandAsync } from './command-runner';
import { createBiomeConfig } from './config';
import { PLUGIN_INFO, PROJECT_NAMES } from './constants';
import { setupBiomeExecutors } from './executors';
import { createDirectoryTestFiles, createTestFiles } from './file-operations';
import { createTestProject } from './project-setup';

/**
 * Setup options for the test environment
 */
export interface SetupOptions {
  /** Whether to reuse an existing project if it exists */
  reuseExisting?: boolean;
}

/**
 * Setup a complete test environment for Biome e2e tests
 * @param options Setup options
 * @returns Object containing project directory, test files info, and other setup data
 */
export async function setupTestEnvironment(options: SetupOptions = {}) {
  const { reuseExisting = false } = options;

  // Create a test project (or reuse existing one)
  const projectDirectory = createTestProject(
    PROJECT_NAMES.TEST_PROJECT,
    undefined, // use default package manager
    'latest',
    reuseExisting
  );

  // If we're reusing a project and all the necessary files exist,
  // we can skip the setup steps
  if (reuseExisting && checkProjectSetup(projectDirectory)) {
    console.log('Existing project setup is valid, reusing it...');

    // Return the paths of the files that should already exist
    const safeTestFilePath = `${projectDirectory}/${PROJECT_NAMES.TEST_LIB_DIR}/src/lib/safe-test.ts`;
    const unsafeTestFilePath = `${projectDirectory}/${PROJECT_NAMES.TEST_LIB_DIR}/src/lib/unsafe-test.ts`;
    const biomeConfigPath = `${projectDirectory}/biome.json`;
    const projectJsonPath = `${projectDirectory}/${PROJECT_NAMES.TEST_LIB_DIR}/project.json`;
    const testDirPath = `${projectDirectory}/${PROJECT_NAMES.TEST_LIB_DIR}/src/test-dir`;

    // We still need to get file paths even when reusing the project
    const filePaths = [];
    for (let i = 0; i < 3; i++) {
      filePaths.push(`${testDirPath}/test-file-${i + 1}.ts`);
    }

    return {
      projectDirectory,
      libName: PROJECT_NAMES.TEST_LIB,
      safeTestFilePath,
      unsafeTestFilePath,
      biomeConfigPath,
      projectJsonPath,
      testDirPath,
      testDirFilePaths: filePaths,
    };
  }

  // Otherwise, perform the full setup
  console.log('Setting up project dependencies and files...');

  // Install the plugin built with the latest source code
  execSync(
    `${getPackageManagerCommand().addDev} ${
      PLUGIN_INFO.PACKAGE_NAME
    }@e2e @nx/js`,
    {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    }
  );

  // Install @biomejs/biome as a development dependency
  console.log('Installing @biomejs/biome in the test project...');
  execSync(`${getPackageManagerCommand().addDev} --save-exact @biomejs/biome`, {
    cwd: projectDirectory,
    stdio: 'inherit',
    env: process.env,
  });

  // Verify that biome is installed correctly
  try {
    const biomeVersion = execSync(
      `${projectDirectory}/node_modules/.bin/biome --version`,
      {
        encoding: 'utf-8',
      }
    );
    console.log('Biome installed correctly. Version:', biomeVersion.trim());
  } catch (error) {
    console.error('Error checking biome version:', error);
  }

  // Generate a JS library
  const libName = PROJECT_NAMES.TEST_LIB;
  await runNxCommandAsync(
    `g @nx/js:library ${libName} --directory=${PROJECT_NAMES.TEST_LIB_DIR} --bundler=none --linter=none --unitTestRunner=jest --no-interactive`,
    { cwd: projectDirectory }
  );

  // Create test files
  console.log('Creating test files...');
  const { safeTestFilePath, unsafeTestFilePath } =
    createTestFiles(projectDirectory);

  // Create directory test files
  console.log('Creating directory test files...');
  const { testDirPath, filePaths: testDirFilePaths } =
    createDirectoryTestFiles(projectDirectory);

  // Setup Biome configuration
  const biomeConfigPath = createBiomeConfig(projectDirectory);

  // Setup executors in project.json, passing the test file paths
  const projectJsonPath = setupBiomeExecutors(projectDirectory, libName, {
    safeTestPath: safeTestFilePath,
    unsafeTestPath: unsafeTestFilePath,
  });

  // Print diagnostic information
  console.log('Project directory:', projectDirectory);
  console.log('Path to biome.json:', biomeConfigPath);
  console.log('Path to project.json:', projectJsonPath);
  console.log('Path to safe test file:', safeTestFilePath);
  console.log('Path to unsafe test file:', unsafeTestFilePath);
  console.log('Path to test directory:', testDirPath);
  console.log('Test directory file paths:', testDirFilePaths);

  return {
    projectDirectory,
    libName,
    safeTestFilePath,
    unsafeTestFilePath,
    biomeConfigPath,
    projectJsonPath,
    testDirPath,
    testDirFilePaths,
  };
}

/**
 * Checks if the project already has all the required setup
 * @param projectDirectory The project directory to check
 * @returns true if the project is already set up
 */
function checkProjectSetup(projectDirectory: string): boolean {
  // Check for critical files
  const requiredFiles = [
    // Biome config
    'biome.json',
    // Plugin library path
    `${PROJECT_NAMES.TEST_LIB_DIR}/project.json`,
    // Test files
    `${PROJECT_NAMES.TEST_LIB_DIR}/src/lib/safe-test.ts`,
    `${PROJECT_NAMES.TEST_LIB_DIR}/src/lib/unsafe-test.ts`,
    // Dependencies
    'node_modules/@biomejs/biome',
    // Test directory (at least one file should exist)
    `${PROJECT_NAMES.TEST_LIB_DIR}/src/test-dir/test-file-1.ts`,
  ];

  // Check that all required files exist
  for (const file of requiredFiles) {
    const filePath = `${projectDirectory}/${file}`;
    if (!existsSync(filePath)) {
      console.log(`Missing required file: ${filePath}`);
      return false;
    }
  }

  return true;
}
