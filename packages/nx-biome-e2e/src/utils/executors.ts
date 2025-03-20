import { writeJsonFile } from '@nx/devkit';
import { join } from 'path';
import { PLUGIN_INFO, PROJECT_NAMES } from './constants';
import { readJson } from './file-operations';

/**
 * Defines the options for a Biome executor
 */
export interface BiomeExecutorOptions {
  filePatterns: string[];
  write?: boolean;
  unsafe?: boolean;
}

/**
 * Interface for test file paths
 */
export interface TestFilePaths {
  safeTestPath: string;
  unsafeTestPath: string;
}

/**
 * Creates all Biome executors in the project.json file for testing
 * @param projectDirectory The directory of the test project
 * @param libName The name of the library to configure
 * @param testFilePaths Object containing the paths to test files (can be absolute or relative)
 * @returns The path to the updated project.json file
 */
export function setupBiomeExecutors(
  projectDirectory: string,
  libName: string,
  testFilePaths: TestFilePaths
): string {
  const projectJsonPath = join(
    projectDirectory,
    `${PROJECT_NAMES.TEST_LIB_DIR}/project.json`
  );

  // Read the project.json file using testing utility
  const projectJson = readJson(projectJsonPath);

  // Make paths relative if they are absolute
  const relativePaths = {
    safeTestPath: makeRelativePath(
      testFilePaths.safeTestPath,
      projectDirectory
    ),
    unsafeTestPath: makeRelativePath(
      testFilePaths.unsafeTestPath,
      projectDirectory
    ),
  };

  // Define executor configurations
  projectJson.targets = {
    ...projectJson.targets,
    // Lint executors with different options
    ...createExecutorConfig('lint', relativePaths),

    // Format executors with different options
    ...createExecutorConfig('format', relativePaths),

    // Check executors with different options
    ...createExecutorConfig('check', relativePaths),
  };

  writeJsonFile(projectJsonPath, projectJson);
  return projectJsonPath;
}

/**
 * Makes a path relative to the project directory if it's absolute
 * @param filePath The file path
 * @param projectDirectory The project directory
 * @returns A path that's relative to the project directory
 */
function makeRelativePath(filePath: string, projectDirectory: string): string {
  // Normalize paths to handle slash/backslash consistently
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedProjectDir = projectDirectory.replace(/\\/g, '/');

  // If the path is not absolute or is already relative, return it as is
  if (!normalizedFilePath.includes(normalizedProjectDir)) {
    return filePath;
  }

  // Remove the projectDirectory from the beginning of the path to make it relative
  // Make sure there are no double slashes
  const relativePath = normalizedFilePath
    .replace(normalizedProjectDir, '')
    .replace(/^\/+/, ''); // Remove initial slashes

  return relativePath;
}

/**
 * Creates executor configurations for a specific command (lint, format, check)
 * @param commandType The type of command (lint, format, check)
 * @param paths Object containing safe and unsafe test file paths
 * @returns Object containing executor configurations
 */
function createExecutorConfig(
  commandType: 'lint' | 'format' | 'check',
  paths: TestFilePaths
): Record<string, { executor: string; options: BiomeExecutorOptions }> {
  const { safeTestPath, unsafeTestPath } = paths;

  return {
    // Basic version (no write/unsafe)
    [`${commandType}Safe`]: {
      executor: `${PLUGIN_INFO.PACKAGE_NAME}:${commandType}`,
      options: {
        filePatterns: [safeTestPath],
      },
    },
    [`${commandType}SafeWrite`]: {
      executor: `${PLUGIN_INFO.PACKAGE_NAME}:${commandType}`,
      options: {
        filePatterns: [safeTestPath],
        write: true,
      },
    },
    [`${commandType}Unsafe`]: {
      executor: `${PLUGIN_INFO.PACKAGE_NAME}:${commandType}`,
      options: {
        filePatterns: [unsafeTestPath],
      },
    },
    [`${commandType}UnsafeWrite`]: {
      executor: `${PLUGIN_INFO.PACKAGE_NAME}:${commandType}`,
      options: {
        filePatterns: [unsafeTestPath],
        write: true,
      },
    },
    [`${commandType}UnsafeWriteUnsafe`]: {
      executor: `${PLUGIN_INFO.PACKAGE_NAME}:${commandType}`,
      options: {
        filePatterns: [unsafeTestPath],
        write: true,
        unsafe: true,
      },
    },
  };
}
