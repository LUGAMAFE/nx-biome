import {
  checkFilesExist as checkFilesExistOriginal,
  readFile as readFileOriginal,
  readJson as readJsonOriginal,
} from '@nx/plugin/testing';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PROJECT_NAMES } from './constants';
import { SAFE_TEST_FILE_CONTENT, UNSAFE_TEST_FILE_CONTENT } from './test-files';

// Re-export functions from @nx/plugin/testing
export const checkFilesExist = checkFilesExistOriginal;
export const readFile = readFileOriginal;
export const readJson = readJsonOriginal;

/**
 * Creates test files for both safe and unsafe fixes
 * @param projectDirectory The directory of the test project
 * @returns Object containing paths to the created files
 */
export function createTestFiles(projectDirectory: string) {
  const safeTestFilePath = join(
    projectDirectory,
    `${PROJECT_NAMES.TEST_LIB_DIR}/src/lib/safe-test.ts`
  );
  const unsafeTestFilePath = join(
    projectDirectory,
    `${PROJECT_NAMES.TEST_LIB_DIR}/src/lib/unsafe-test.ts`
  );

  writeFileSync(safeTestFilePath, SAFE_TEST_FILE_CONTENT);
  writeFileSync(unsafeTestFilePath, UNSAFE_TEST_FILE_CONTENT);

  return {
    safeTestFilePath,
    unsafeTestFilePath,
  };
}

/**
 * Creates multiple test files in a directory for testing directory patterns
 * @param projectDirectory The directory of the test project
 * @param numFiles Number of files to create (default: 3)
 * @param fileType Type of files to create (safe, unsafe, or mixed)
 * @returns Object containing information about the created directory and files
 */
export function createDirectoryTestFiles(
  projectDirectory: string,
  numFiles = 3,
  fileType: 'safe' | 'unsafe' | 'mixed' = 'mixed'
) {
  // Create a directory for testing folder patterns
  const testDirPath = join(
    projectDirectory,
    `${PROJECT_NAMES.TEST_LIB_DIR}/src/test-dir`
  );

  // Ensure the directory exists
  mkdirSync(testDirPath, { recursive: true });

  const filePaths: string[] = [];

  // Create the specified number of files
  for (let i = 0; i < numFiles; i++) {
    let content: string;

    // Determine content based on fileType
    if (fileType === 'safe') {
      content = SAFE_TEST_FILE_CONTENT;
    } else if (fileType === 'unsafe') {
      content = UNSAFE_TEST_FILE_CONTENT;
    } else {
      // For 'mixed', alternate between safe and unsafe
      content = i % 2 === 0 ? SAFE_TEST_FILE_CONTENT : UNSAFE_TEST_FILE_CONTENT;
    }

    const filePath = join(testDirPath, `test-file-${i + 1}.ts`);
    writeFileSync(filePath, content);
    filePaths.push(filePath);
  }

  return {
    testDirPath,
    filePaths,
  };
}

/**
 * Restores a file to its original content
 * @param filePath The path to the file
 * @param originalContent The original content to restore
 */
export function restoreFile(filePath: string, originalContent: string): void {
  writeFileSync(filePath, originalContent);
}

/**
 * Reads the content of a file
 * @param filePath The path to the file
 * @returns The content of the file
 */
export function readTestFile(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}
