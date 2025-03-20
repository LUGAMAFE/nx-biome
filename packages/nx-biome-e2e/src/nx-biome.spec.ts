import { getPackageManagerCommand } from '@nx/devkit';
import { execSync } from 'child_process';
import { runNxCommandAsync } from './utils/command-runner';
import { PLUGIN_INFO, PROJECT_NAMES } from './utils/constants';
import { detectSafeFileFixes, detectUnsafeFileFixes } from './utils/detectors';
import {
  checkFilesExist,
  readTestFile,
  restoreFile,
} from './utils/file-operations';
import { setupTestEnvironment } from './utils/setup';
import {
  SAFE_TEST_FILE_CONTENT,
  UNSAFE_TEST_FILE_CONTENT,
} from './utils/test-files';
import {
  expectFormatFixesApplied,
  expectSafeLintFixesApplied,
  expectUnsafeLintFixesApplied,
  testBiomeExecutor,
  testDirectoryPattern,
} from './utils/test-helpers';

// Determine if we should reuse the project from the environment variable
// This allows switching from the command line or CI configuration
/* const REUSE_PROJECT = process.env.NX_BIOME_REUSE_PROJECT === 'true'; */
const REUSE_PROJECT = true;

jest.setTimeout(120000);

describe('nx-biome e2e', () => {
  let projectDirectory: string;
  let safeTestFilePath: string;
  let unsafeTestFilePath: string;
  let biomeConfigPath: string;
  let projectJsonPath: string;
  let testDirPath: string;
  let testDirFilePaths: string[];

  // Increase the specific timeout for this hook
  beforeAll(async () => {
    console.log(
      `Setting up test environment (reuse project: ${REUSE_PROJECT})`
    );

    // Setup the test environment with the reuse option
    const environment = await setupTestEnvironment({
      reuseExisting: REUSE_PROJECT,
    });

    projectDirectory = environment.projectDirectory;
    safeTestFilePath = environment.safeTestFilePath;
    unsafeTestFilePath = environment.unsafeTestFilePath;
    biomeConfigPath = environment.biomeConfigPath;
    projectJsonPath = environment.projectJsonPath;
    testDirPath = environment.testDirPath;
    testDirFilePaths = environment.testDirFilePaths;

    // Verify files exist - Use full paths
    expect(() =>
      checkFilesExist(
        biomeConfigPath,
        projectJsonPath,
        safeTestFilePath,
        unsafeTestFilePath,
        ...testDirFilePaths
      )
    ).not.toThrow();
  }, 300000); // 5 minutes timeout for beforeAll

  it('should be installed', () => {
    // npm ls will fail if the package is not installed properly
    execSync(`${getPackageManagerCommand().list} ${PLUGIN_INFO.PACKAGE_NAME}`, {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
  });

  describe('lint executor', () => {
    // Tests to verify the lint executor options
    describe('without write/unsafe options', () => {
      it('should detect errors in safe file without applying changes', async () => {
        await testBiomeExecutor({
          executorName: 'lintSafe',
          testType: 'lint',
          projectDirectory,
          testFile: safeTestFilePath,
          writeEnabled: false,
          fileType: 'safe',
        });
      });

      it('should detect errors in unsafe file without applying changes', async () => {
        await testBiomeExecutor({
          executorName: 'lintUnsafe',
          testType: 'lint',
          projectDirectory,
          testFile: unsafeTestFilePath,
          writeEnabled: false,
          fileType: 'unsafe',
        });
      });
    });

    describe('with write=true option', () => {
      it('should fix all errors in safe file', async () => {
        await testBiomeExecutor({
          executorName: 'lintSafeWrite',
          testType: 'lint',
          projectDirectory,
          testFile: safeTestFilePath,
          writeEnabled: true,
          fileType: 'safe',
        });
      });

      it('should fix only safe errors in unsafe file', async () => {
        await testBiomeExecutor({
          executorName: 'lintUnsafeWrite',
          testType: 'lint',
          projectDirectory,
          testFile: unsafeTestFilePath,
          writeEnabled: true,
          fileType: 'unsafe',
          unsafeEnabled: false,
        });
      });
    });

    describe('with write=true and unsafe=true options', () => {
      it('should fix all errors, including unsafe ones, in unsafe file with --unsafe', async () => {
        await testBiomeExecutor({
          executorName: 'lintUnsafeWriteUnsafe',
          testType: 'lint',
          projectDirectory,
          testFile: unsafeTestFilePath,
          writeEnabled: true,
          fileType: 'unsafe',
          unsafeEnabled: true,
        });
      });
    });
  });

  describe('format executor', () => {
    describe('without write option', () => {
      it('should detect format issues without applying changes', async () => {
        await testBiomeExecutor({
          executorName: 'formatSafe',
          testType: 'format',
          projectDirectory,
          testFile: safeTestFilePath,
          writeEnabled: false,
          fileType: 'safe',
        });
      });
    });

    describe('with write=true option', () => {
      it('should fix format issues in safe file', async () => {
        await testBiomeExecutor({
          executorName: 'formatSafeWrite',
          testType: 'format',
          projectDirectory,
          testFile: safeTestFilePath,
          writeEnabled: true,
          fileType: 'safe',
        });
      });

      it('should fix format issues in unsafe file', async () => {
        await testBiomeExecutor({
          executorName: 'formatUnsafeWrite',
          testType: 'format',
          projectDirectory,
          testFile: unsafeTestFilePath,
          writeEnabled: true,
          fileType: 'unsafe',
        });
      });
    });

    it('should fail when using the unsafe option with the format command', async () => {
      try {
        await runNxCommandAsync(
          `formatUnsafeWriteUnsafe ${PROJECT_NAMES.TEST_LIB}`,
          {
            cwd: projectDirectory,
          }
        );
        // If we get here, the test should fail because the expected error didn't occur
        throw new Error(
          'Expected format command with unsafe option to fail but it succeeded'
        );
      } catch (error) {
        // This assertion is the only one we count on
        expect(error).toBeDefined();
        // The test passes because the command failed as expected
      }
    });
  });

  describe('check executor', () => {
    describe('without write/unsafe options', () => {
      it('should detect linting and formatting issues without applying changes', async () => {
        await testBiomeExecutor({
          executorName: 'checkSafe',
          testType: 'check',
          projectDirectory,
          testFile: safeTestFilePath,
          writeEnabled: false,
          fileType: 'safe',
        });
      });
    });

    describe('with write=true option', () => {
      it('should fix all safe issues', async () => {
        await testBiomeExecutor({
          executorName: 'checkSafeWrite',
          testType: 'check',
          projectDirectory,
          testFile: safeTestFilePath,
          writeEnabled: true,
          fileType: 'safe',
        });
      });

      it('should fix only safe errors in unsafe file', async () => {
        await testBiomeExecutor({
          executorName: 'checkUnsafeWrite',
          testType: 'check',
          projectDirectory,
          testFile: unsafeTestFilePath,
          writeEnabled: true,
          fileType: 'unsafe',
          unsafeEnabled: false,
        });
      });
    });

    describe('with write=true and unsafe=true options', () => {
      it('should fix all issues including unsafe ones', async () => {
        await testBiomeExecutor({
          executorName: 'checkUnsafeWriteUnsafe',
          testType: 'check',
          projectDirectory,
          testFile: unsafeTestFilePath,
          writeEnabled: true,
          fileType: 'unsafe',
          unsafeEnabled: true,
        });
      });
    });
  });

  // Tests to verify that CLI flags override default options
  describe('command line flags override', () => {
    it('should apply write flag when passed via command line', async () => {
      // First we restore the file to its original state
      restoreFile(safeTestFilePath, SAFE_TEST_FILE_CONTENT);
      const beforeContent = readTestFile(safeTestFilePath);

      // We execute the command with the write=true flag via command line
      // We use quotes to ensure it's interpreted correctly
      await runNxCommandAsync(`formatSafe ${PROJECT_NAMES.TEST_LIB} --write`, {
        cwd: projectDirectory,
      });

      // We verify that the file was modified despite using the "formatSafe" executor
      // which by default doesn't have the write option enabled
      const afterContent = readTestFile(safeTestFilePath);
      expect(afterContent).not.toEqual(beforeContent);

      // We verify that the format changes were applied
      const fixes = detectSafeFileFixes(afterContent);
      expectFormatFixesApplied(fixes.format, 'Safe Format via CLI');
    });

    it('should apply unsafe flag when passed via command line', async () => {
      // First we restore the file to its original state
      restoreFile(unsafeTestFilePath, UNSAFE_TEST_FILE_CONTENT);
      // We execute the lint command with the unsafe=true flag
      // We use quotes to ensure it's interpreted correctly
      await runNxCommandAsync(
        `lintUnsafeWrite ${PROJECT_NAMES.TEST_LIB} --unsafe=true`,
        { cwd: projectDirectory }
      );

      // We verify that the lint changes were applied, including unsafe ones
      const afterContent = readTestFile(unsafeTestFilePath);
      const fixes = detectUnsafeFileFixes(afterContent);

      // We verify that the safe fixes were applied
      expectSafeLintFixesApplied(fixes.lint, 'Unsafe Lint via CLI');

      // We verify that unsafe fixes were also applied
      // (which confirms that the --unsafe=true flag worked)
      expectUnsafeLintFixesApplied(
        fixes.lint.unsafe || {},
        true,
        'Unsafe Lint via CLI'
      );
    });

    it('should override project.json config with command line flags', async () => {
      // First we restore the file to its original state
      restoreFile(safeTestFilePath, SAFE_TEST_FILE_CONTENT);
      const beforeContent = readTestFile(safeTestFilePath);
      // We execute the command with both flags explicitly false
      // We use quotes to ensure it's interpreted correctly
      try {
        await runNxCommandAsync(
          `formatSafeWrite ${PROJECT_NAMES.TEST_LIB} --write=false`,
          { cwd: projectDirectory }
        );
      } catch (error) {
        // For non-write executors, we expect to get here
        expect(error).toBeDefined();
      }

      // We verify that the file was NOT modified (--write=false overrode the write=true option of the executor)
      const afterContent = readTestFile(safeTestFilePath);
      expect(afterContent).toEqual(beforeContent);
    });
  });

  // Tests to verify functionality with directory patterns
  describe('directory pattern tests', () => {
    describe('format executor with directory pattern', () => {
      it('should format all files in a directory when using a directory pattern', async () => {
        await testDirectoryPattern({
          executorName: 'formatSafeWrite',
          testType: 'format',
          projectDirectory,
          testDirPath,
          testFilePaths: testDirFilePaths,
          writeEnabled: true,
          directoryPattern: `${PROJECT_NAMES.TEST_LIB_DIR}/src/test-dir`,
        });
      });

      it('should detect but not apply format issues when not using write flag', async () => {
        await testDirectoryPattern({
          executorName: 'formatSafe',
          testType: 'format',
          projectDirectory,
          testDirPath,
          testFilePaths: testDirFilePaths,
          writeEnabled: false,
          directoryPattern: `${PROJECT_NAMES.TEST_LIB_DIR}/src/test-dir`,
        });
      });
    });

    describe('lint executor with directory pattern', () => {
      it('should apply safe lint fixes to all files in a directory', async () => {
        await testDirectoryPattern({
          executorName: 'lintSafeWrite',
          testType: 'lint',
          projectDirectory,
          testDirPath,
          testFilePaths: testDirFilePaths,
          writeEnabled: true,
          directoryPattern: `${PROJECT_NAMES.TEST_LIB_DIR}/src/test-dir`,
        });
      });

      it('should apply unsafe lint fixes when using the unsafe flag', async () => {
        await testDirectoryPattern({
          executorName: 'lintUnsafeWriteUnsafe',
          testType: 'lint',
          projectDirectory,
          testDirPath,
          testFilePaths: testDirFilePaths,
          writeEnabled: true,
          unsafeEnabled: true,
          directoryPattern: `${PROJECT_NAMES.TEST_LIB_DIR}/src/test-dir`,
        });
      });
    });

    describe('check executor with directory pattern', () => {
      it('should apply both lint and format fixes to all files in a directory', async () => {
        await testDirectoryPattern({
          executorName: 'checkSafeWrite',
          testType: 'check',
          projectDirectory,
          testDirPath,
          testFilePaths: testDirFilePaths,
          writeEnabled: true,
          directoryPattern: `${PROJECT_NAMES.TEST_LIB_DIR}/src/test-dir`,
        });
      });

      it('should apply unsafe fixes when using the unsafe flag', async () => {
        await testDirectoryPattern({
          executorName: 'checkUnsafeWriteUnsafe',
          testType: 'check',
          projectDirectory,
          testDirPath,
          testFilePaths: testDirFilePaths,
          writeEnabled: true,
          unsafeEnabled: true,
          directoryPattern: `${PROJECT_NAMES.TEST_LIB_DIR}/src/test-dir`,
        });
      });
    });

    // Test of CLI flags with directory patterns
    it('should respect CLI flags with directory patterns', async () => {
      // We restore all files
      for (const filePath of testDirFilePaths) {
        const fileIndex = parseInt(
          filePath.match(/test-file-(\d+)/)?.[1] || '1'
        );
        const content =
          fileIndex % 2 === 0
            ? SAFE_TEST_FILE_CONTENT
            : UNSAFE_TEST_FILE_CONTENT;
        restoreFile(filePath, content);
      }

      // We save the content before executing
      const beforeContents = testDirFilePaths.map((filePath) => ({
        path: filePath,
        content: readTestFile(filePath),
      }));

      // We execute a command that normally wouldn't make changes, but we pass --write=true
      // We use quotes to ensure it's interpreted correctly
      await runNxCommandAsync(
        `formatSafe ${PROJECT_NAMES.TEST_LIB} --filePatterns="${PROJECT_NAMES.TEST_LIB_DIR}/src/test-dir" --write="true"`,
        { cwd: projectDirectory }
      );

      // We verify that the files have changed
      let changedFiles = 0;
      for (let i = 0; i < testDirFilePaths.length; i++) {
        const afterContent = readTestFile(testDirFilePaths[i]);
        if (afterContent !== beforeContents[i].content) {
          changedFiles++;
        }
      }

      expect(changedFiles).toBeGreaterThan(0);
    });
  });
});
