import { runNxCommandAsync } from './command-runner';
import { PROJECT_NAMES } from './constants';
import {
  detectSafeFileFixes,
  detectUnsafeFileFixes,
  FormatFixes,
  LintFixes,
} from './detectors';
import { readTestFile, restoreFile } from './file-operations';
import { SAFE_TEST_FILE_CONTENT, UNSAFE_TEST_FILE_CONTENT } from './test-files';

export type TestType = 'lint' | 'format' | 'check';
export type FileType = 'safe' | 'unsafe';

/**
 * Configuration options for running Biome executor tests
 */
export interface BiomeTestOptions {
  /** The name of the executor to test (e.g. 'lintSafe', 'formatSafeWrite', etc.) */
  executorName: string;
  /** The type of operation being tested (lint, format, check) */
  testType: TestType;
  /** The directory of the test project */
  projectDirectory: string;
  /** The file to test */
  testFile: string;
  /** Whether the write option is enabled */
  writeEnabled: boolean;
  /** Whether the unsafe option is enabled */
  unsafeEnabled?: boolean;
  /** Whether to use a safe or unsafe test file */
  fileType: FileType;
}

/**
 * Runs a test for a Biome executor with the specified options
 * @param options Test configuration options
 */
export async function testBiomeExecutor(
  options: BiomeTestOptions
): Promise<void> {
  const {
    executorName,
    testType,
    projectDirectory,
    testFile,
    writeEnabled,
    unsafeEnabled = false,
    fileType,
  } = options;

  // Determine the original content based on file type
  const originalContent =
    fileType === 'safe' ? SAFE_TEST_FILE_CONTENT : UNSAFE_TEST_FILE_CONTENT;

  // Restore the file to its original state before the test
  restoreFile(testFile, originalContent);

  // Save a copy to compare later (for non-write tests)
  const beforeContent = readTestFile(testFile);

  try {
    // Run the executor command
    const result = await runNxCommandAsync(
      `${executorName} ${PROJECT_NAMES.TEST_LIB}`,
      {
        cwd: projectDirectory,
      }
    );

    if (!writeEnabled) {
      // If we get here with non-write executors, the test should fail
      throw new Error(`Expected ${testType} command to fail but it succeeded`);
    }

    // For write executors, log the output for debugging
    console.log(`${executorName} output:`, result.stdout);
  } catch (error) {
    // For non-write executors, we expect to get here
    expect(error).toBeDefined();

    if (!writeEnabled) {
      // For non-write executors, verify that the file hasn't changed
      const currentContent = readTestFile(testFile);
      expect(currentContent).toEqual(beforeContent);
      return; // End the test here for non-write executors
    }
  }

  // For write executors, continue with verification
  if (writeEnabled) {
    // Read the file after the executor has run
    const afterContent = readTestFile(testFile);

    // Verify it was modified
    expect(afterContent).not.toEqual(originalContent);

    // Verify the specific fixes based on test type and file type
    verifyAppliedFixes({
      testType,
      fileType,
      unsafeEnabled,
      fileContent: afterContent,
    });
  }
}

/**
 * Options for verifying applied fixes
 */
interface VerifyFixesOptions {
  /** The type of test being performed */
  testType: TestType;
  /** The type of file being tested */
  fileType: FileType;
  /** Whether the unsafe option is enabled */
  unsafeEnabled: boolean;
  /** The content of the file after running the command */
  fileContent: string;
}

/**
 * Verifies that the expected fixes were applied based on test type and file type
 * @param options Options for verification
 */
function verifyAppliedFixes(options: VerifyFixesOptions): void {
  const { testType, fileType, unsafeEnabled, fileContent } = options;

  // Get the appropriate fixes based on file type
  const fileFixes =
    fileType === 'safe'
      ? detectSafeFileFixes(fileContent)
      : detectUnsafeFileFixes(fileContent);

  // Verify format fixes if applicable
  if (testType === 'format' || testType === 'check') {
    expectFormatFixesApplied(fileFixes.format, `${fileType} Format`);
  }

  // Verify lint fixes if applicable
  if (testType === 'lint' || testType === 'check') {
    // Safe lint fixes should always be applied
    expectSafeLintFixesApplied(fileFixes.lint, `${fileType} Lint`);

    // For unsafe files, verify unsafe lint fixes based on the unsafe option
    if (fileType === 'unsafe' && fileFixes.lint.unsafe) {
      expectUnsafeLintFixesApplied(
        fileFixes.lint.unsafe,
        unsafeEnabled,
        `${fileType} Unsafe Lint`
      );
    }
  }

  // For format operations on unsafe files, verify they don't fix lint issues
  if (fileType === 'unsafe' && testType === 'format' && fileFixes.lint.unsafe) {
    Object.entries(fileFixes.lint.unsafe).forEach(([key, value]) => {
      expect(value).toBeFalsy();
      if (value) {
        console.log(`Format should not fix lint issues (${key})`);
      }
    });
  }
}

/**
 * Expects that all format fixes are applied
 * @param fixes Format fixes object
 * @param fixType Type of fix for logging purposes
 */
export function expectFormatFixesApplied(
  fixes: FormatFixes,
  fixType: string
): void {
  Object.entries(fixes).forEach(([key, value]) => {
    expect(value).toBeTruthy();
    if (!value) {
      console.log(`${fixType} fix '${key}' was not applied`);
    }
  });
}

/**
 * Expects that all safe lint fixes are applied
 * @param fixes Lint fixes object
 * @param fixType Type of fix for logging purposes
 */
export function expectSafeLintFixesApplied(
  fixes: LintFixes,
  fixType: string
): void {
  Object.entries(fixes.safe).forEach(([key, value]) => {
    expect(value).toBeTruthy();
    if (!value) {
      console.log(`${fixType} safe fix '${key}' was not applied`);
    }
  });
}

/**
 * Expects that unsafe lint fixes are applied according to the unsafe option
 * @param unsafeFixes Unsafe lint fixes object
 * @param unsafeEnabled Whether unsafe fixes should be applied
 * @param fixType Type of fix for logging purposes
 */
export function expectUnsafeLintFixesApplied(
  unsafeFixes: Record<string, boolean | undefined>,
  unsafeEnabled: boolean,
  fixType: string
): void {
  Object.entries(unsafeFixes).forEach(([key, value]) => {
    if (unsafeEnabled) {
      expect(value).toBeTruthy();
      if (!value) {
        console.log(
          `${fixType} fix '${key}' was not applied with unsafe option`
        );
      }
    } else {
      expect(value).toBeFalsy();
      if (value) {
        console.log(
          `${fixType} fix '${key}' was applied without unsafe option`
        );
      }
    }
  });
}

/**
 * Options for testing directory patterns
 */
export interface DirectoryTestOptions {
  /** The name of the executor to test (e.g. 'lintSafe', 'formatSafeWrite', etc.) */
  executorName: string;
  /** The type of operation being tested (lint, format, check) */
  testType: TestType;
  /** The directory of the test project */
  projectDirectory: string;
  /** Path to the directory containing test files */
  testDirPath: string;
  /** Paths to all files in the test directory */
  testFilePaths: string[];
  /** Whether the write option is enabled */
  writeEnabled: boolean;
  /** Whether the unsafe option is enabled */
  unsafeEnabled?: boolean;
  /** The directory pattern to use in the command (e.g. "libs/test-lib/src/test-dir") */
  directoryPattern: string;
}

/**
 * Tests a Biome executor on a directory pattern
 * @param options Options for the directory test
 */
export async function testDirectoryPattern(
  options: DirectoryTestOptions
): Promise<void> {
  const {
    executorName,
    testType,
    projectDirectory,
    testFilePaths,
    writeEnabled,
    unsafeEnabled = false,
    directoryPattern,
  } = options;

  // Restore all files to their original state
  for (const filePath of testFilePaths) {
    // Determine original content based on filename (we'll use even numbers for safe files)
    const fileIndex = parseInt(filePath.match(/test-file-(\d+)/)?.[1] || '1');
    const content =
      fileIndex % 2 === 0 ? SAFE_TEST_FILE_CONTENT : UNSAFE_TEST_FILE_CONTENT;
    restoreFile(filePath, content);
  }

  // Save copies of content to compare later
  const beforeContents = testFilePaths.map((filePath) => ({
    path: filePath,
    content: readTestFile(filePath),
  }));

  try {
    // Run the command with the directory pattern
    const result = await runNxCommandAsync(
      `${executorName} ${
        PROJECT_NAMES.TEST_LIB
      } --filePatterns=${directoryPattern}${writeEnabled && ' --write'}${
        unsafeEnabled && ' --unsafe'
      }`,
      {
        cwd: projectDirectory,
      }
    );

    if (!writeEnabled) {
      // For non-write executors, we shouldn't reach here
      throw new Error(
        `Expected ${testType} command with directory pattern to fail but it succeeded`
      );
    }

    // For write executors, log the output
    console.log(
      `${executorName} with directory pattern output:`,
      result.stdout
    );
  } catch (error) {
    // For non-write executors, we expect to get here
    expect(error).toBeDefined();

    if (!writeEnabled) {
      // Verify none of the files changed for non-write executors
      for (const { path, content } of beforeContents) {
        const currentContent = readTestFile(path);
        expect(currentContent).toEqual(content);
      }
      return; // End the test for non-write executors
    }
  }

  // For write executors, verify the files were changed
  if (writeEnabled) {
    let changedFileCount = 0;

    // Check each file
    for (let i = 0; i < testFilePaths.length; i++) {
      const filePath = testFilePaths[i];
      const beforeContent = beforeContents[i].content;
      const afterContent = readTestFile(filePath);

      // Determine if this is a safe or unsafe file based on index
      const fileIndex = parseInt(filePath.match(/test-file-(\d+)/)?.[1] || '1');
      const fileType: FileType = fileIndex % 2 === 0 ? 'safe' : 'unsafe';

      // For files that should be modified, verify the changes
      if (afterContent !== beforeContent) {
        changedFileCount++;

        // Verify the specific fixes based on file type and test type
        const fileFixes =
          fileType === 'safe'
            ? detectSafeFileFixes(afterContent)
            : detectUnsafeFileFixes(afterContent);

        // Verify format fixes if applicable
        if (testType === 'format' || testType === 'check') {
          expectFormatFixesApplied(
            fileFixes.format,
            `${fileType} Format (Directory)`
          );
        }

        // Verify lint fixes if applicable
        if (testType === 'lint' || testType === 'check') {
          expectSafeLintFixesApplied(
            fileFixes.lint,
            `${fileType} Lint (Directory)`
          );

          // For unsafe files, verify unsafe lint fixes based on the unsafe option
          if (fileType === 'unsafe' && fileFixes.lint.unsafe) {
            expectUnsafeLintFixesApplied(
              fileFixes.lint.unsafe,
              unsafeEnabled,
              `${fileType} Unsafe Lint (Directory)`
            );
          }
        }
      }
    }

    // Ensure at least some files were changed
    expect(changedFileCount).toBeGreaterThan(0);
    console.log(`Number of files changed in directory: ${changedFileCount}`);
  }
}
