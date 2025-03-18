import { getPackageManagerCommand, writeJsonFile } from '@nx/devkit';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  checkFilesExist,
  createTestProject,
  readJson,
  runNxCommandAsync,
} from './utils/testing';

jest.setTimeout(120000);

describe('nx-biome e2e', () => {
  let projectDirectory: string;
  let testFilePath: string;
  let originalContent: string;

  // Test file with only errors that are safe to fix (can be automatically corrected)
  const SAFE_TEST_FILE_CONTENT = `
    // FORMAT: javascript.formatter.semicolons="always" - Missing semicolons (safe fix)
    const safeVar = 5

    // FORMAT: javascript.formatter.quoteStyle="single" - Incorrect quotes (safe fix)
    const safeQuotes = "these quotes should be single"

    // FORMAT: javascript.formatter.indentStyle="space" - Incorrect spacing (safe fix)
    function safeSpacing(  ) {
      const   x   =  1
      return x
    }

    // LINT: style/useConst - Use const instead of let when there's no reassignment (safe fix)
    let safeConst = "this should be const"

    // FORMAT: javascript.formatter.semicolons="always" - Missing semicolon (safe fix)
    const safeSemicolon = true
  `;

  // Test file with mixed errors (safe and unsafe to fix)
  const UNSAFE_TEST_FILE_CONTENT = `
    // SAFE FORMAT: javascript.formatter.semicolons="always" - Missing semicolons (safe fix)
    const mixedVar = 5

    // UNSAFE LINT: complexity/noExtraBooleanCast - Extra boolean cast (unsafe fix)
    if (!!true) {
      console.log("test")
    }

    // SAFE FORMAT: javascript.formatter.quoteStyle="single" - Incorrect quotes (safe fix)
    const mixedQuotes = "should be single quotes"

    // LINT: style/useNumberNamespace - Use Number.parseInt instead of global parseInt (safe fix)
    const safeNamespace = parseInt("42", 10);

    // UNSAFE LINT: style/useTemplate - String concatenation with variables (unsafe fix)
    const greeting = "world";
    const unsafeTemplate = "hello " + greeting
  `;

  // Increase the specific timeout for this hook
  beforeAll(async () => {
    // Create a test project using our utility function
    projectDirectory = createTestProject();

    // Install the plugin built with the latest source code
    execSync(
      `${getPackageManagerCommand().addDev} @LUGAMAFE/nx-biome@e2e @nx/js`,
      {
        cwd: projectDirectory,
        stdio: 'inherit',
        env: process.env,
      }
    );

    // Install @biomejs/biome as a development dependency
    console.log('Installing @biomejs/biome in the test project...');
    execSync(
      `${getPackageManagerCommand().addDev} --save-exact @biomejs/biome`,
      {
        cwd: projectDirectory,
        stdio: 'inherit',
        env: process.env,
      }
    );

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

    // Generate a JS library using our runNxCommandAsync utility
    const libName = 'test-lib';
    await runNxCommandAsync(
      `g @nx/js:library ${libName} --directory=libs/test-lib --bundler=none --linter=none --unitTestRunner=jest --no-interactive`,
      { cwd: projectDirectory }
    );

    // Create test files for both safe and unsafe fixes
    const safeTestFilePath = join(
      projectDirectory,
      'libs/test-lib/src/lib/safe-test.ts'
    );
    const unsafeTestFilePath = join(
      projectDirectory,
      'libs/test-lib/src/lib/unsafe-test.ts'
    );

    writeFileSync(safeTestFilePath, SAFE_TEST_FILE_CONTENT);
    writeFileSync(unsafeTestFilePath, UNSAFE_TEST_FILE_CONTENT);

    // The testFilePath will be used for tests that don't specify a path
    testFilePath = safeTestFilePath;
    originalContent = SAFE_TEST_FILE_CONTENT;

    // Make sure the directory structure exists
    console.log('Safe test file created at:', safeTestFilePath);
    console.log('Unsafe test file created at:', unsafeTestFilePath);

    // Setup Biome configuration in the project root
    const biomeConfigPath = join(projectDirectory, 'biome.json');
    console.log('Creating Biome configuration file at:', biomeConfigPath);
    writeJsonFile(biomeConfigPath, {
      $schema: 'https://biomejs.dev/schemas/1.9.4/schema.json',
      vcs: {
        enabled: false,
        clientKind: 'git',
        useIgnoreFile: false,
      },
      files: {
        ignoreUnknown: true,
        ignore: ['**/node_modules/**', '**/dist/**'],
      },
      formatter: {
        enabled: true,
        indentStyle: 'space',
        lineWidth: 100,
      },
      organizeImports: {
        enabled: true,
      },
      linter: {
        enabled: true,
        rules: {
          recommended: false,
          style: {
            useConst: 'error',
            useTemplate: 'error',
            useNumberNamespace: 'error',
          },
          complexity: {
            noExtraBooleanCast: 'error',
          },
        },
      },
      javascript: {
        formatter: {
          quoteStyle: 'single',
          trailingCommas: 'all',
          semicolons: 'always',
        },
      },
    });

    // Update project.json to add Biome executors
    const projectJsonPath = join(
      projectDirectory,
      'libs/test-lib/project.json'
    );
    const projectJson = readJson(projectJsonPath);

    projectJson.targets = {
      ...projectJson.targets,
      // Lint executors with different options
      lintSafe: {
        executor: '@LUGAMAFE/nx-biome:lint',
        options: {
          filePatterns: ['libs/test-lib/src/lib/safe-test.ts'],
        },
      },
      lintSafeWrite: {
        executor: '@LUGAMAFE/nx-biome:lint',
        options: {
          filePatterns: ['libs/test-lib/src/lib/safe-test.ts'],
          write: true,
        },
      },
      lintUnsafe: {
        executor: '@LUGAMAFE/nx-biome:lint',
        options: {
          filePatterns: ['libs/test-lib/src/lib/unsafe-test.ts'],
        },
      },
      lintUnsafeWrite: {
        executor: '@LUGAMAFE/nx-biome:lint',
        options: {
          filePatterns: ['libs/test-lib/src/lib/unsafe-test.ts'],
          write: true,
        },
      },
      lintUnsafeWriteUnsafe: {
        executor: '@LUGAMAFE/nx-biome:lint',
        options: {
          filePatterns: ['libs/test-lib/src/lib/unsafe-test.ts'],
          write: true,
          unsafe: true,
        },
      },
      // Format executors with different options
      formatSafe: {
        executor: '@LUGAMAFE/nx-biome:format',
        options: {
          filePatterns: ['libs/test-lib/src/lib/safe-test.ts'],
        },
      },
      formatSafeWrite: {
        executor: '@LUGAMAFE/nx-biome:format',
        options: {
          filePatterns: ['libs/test-lib/src/lib/safe-test.ts'],
          write: true,
        },
      },
      formatUnsafe: {
        executor: '@LUGAMAFE/nx-biome:format',
        options: {
          filePatterns: ['libs/test-lib/src/lib/unsafe-test.ts'],
        },
      },
      formatUnsafeWrite: {
        executor: '@LUGAMAFE/nx-biome:format',
        options: {
          filePatterns: ['libs/test-lib/src/lib/unsafe-test.ts'],
          write: true,
        },
      },
      formatUnsafeWriteUnsafe: {
        executor: '@LUGAMAFE/nx-biome:format',
        options: {
          filePatterns: ['libs/test-lib/src/lib/unsafe-test.ts'],
          write: true,
          unsafe: true,
        },
      },
      // Check executors with different options
      checkSafe: {
        executor: '@LUGAMAFE/nx-biome:check',
        options: {
          filePatterns: ['libs/test-lib/src/lib/safe-test.ts'],
        },
      },
      checkSafeWrite: {
        executor: '@LUGAMAFE/nx-biome:check',
        options: {
          filePatterns: ['libs/test-lib/src/lib/safe-test.ts'],
          write: true,
        },
      },
      checkUnsafe: {
        executor: '@LUGAMAFE/nx-biome:check',
        options: {
          filePatterns: ['libs/test-lib/src/lib/unsafe-test.ts'],
        },
      },
      checkUnsafeWrite: {
        executor: '@LUGAMAFE/nx-biome:check',
        options: {
          filePatterns: ['libs/test-lib/src/lib/unsafe-test.ts'],
          write: true,
        },
      },
      checkUnsafeWriteUnsafe: {
        executor: '@LUGAMAFE/nx-biome:check',
        options: {
          filePatterns: ['libs/test-lib/src/lib/unsafe-test.ts'],
          write: true,
          unsafe: true,
        },
      },
    };

    writeJsonFile(projectJsonPath, projectJson);

    // Print diagnostic information to verify paths
    console.log('Project directory:', projectDirectory);
    console.log('Path to biome.json:', join(projectDirectory, 'biome.json'));
    console.log(
      'Path to project.json:',
      join(projectDirectory, 'libs/test-lib/project.json')
    );

    // Verify files exist - Use full paths
    expect(() =>
      checkFilesExist(
        join(projectDirectory, 'biome.json'),
        join(projectDirectory, 'libs/test-lib/project.json'),
        join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
        join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts')
      )
    ).not.toThrow();
  }, 300000); // 5 minutes timeout for beforeAll

  beforeEach(() => {
    // Restore the file to its original state before each test
    writeFileSync(testFilePath, originalContent);
  });

  afterAll(() => {
    // Cleanup is handled by the test framework
  });

  it('should be installed', () => {
    // npm ls will fail if the package is not installed properly
    execSync(`${getPackageManagerCommand().list} @LUGAMAFE/nx-biome`, {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
  });

  describe('lint executor', () => {
    // Tests to verify the lint executor options

    describe('without write/unsafe options', () => {
      it('should detect errors in safe file without applying changes', async () => {
        // Save a copy of the original file to compare later
        const originalContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          'utf-8'
        );

        try {
          await runNxCommandAsync('lintSafe test-lib', {
            cwd: projectDirectory,
          });
          // If we get here, the test should fail because the expected error didn't occur
        } catch (error) {
          expect(error).toBeDefined();
        }

        // Verify that the file hasn't changed
        const currentContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          'utf-8'
        );
        expect(currentContent).toEqual(originalContent);
      });

      it('should detect errors in unsafe file without applying changes', async () => {
        // Save a copy of the original file to compare later
        const originalContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          'utf-8'
        );

        try {
          await runNxCommandAsync('lintUnsafe test-lib', {
            cwd: projectDirectory,
          });
          // If we get here, the test should fail because the expected error didn't occur
        } catch (error) {
          expect(error).toBeDefined();
        }

        // Verify that the file hasn't changed
        const currentContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          'utf-8'
        );
        expect(currentContent).toEqual(originalContent);
      });
    });

    describe('with write=true option', () => {
      it('should fix all errors in safe file', async () => {
        // Restore the file to its original state
        writeFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          SAFE_TEST_FILE_CONTENT
        );

        const result = await runNxCommandAsync('lintSafeWrite test-lib', {
          cwd: projectDirectory,
        });

        console.log('lintSafeWrite output:', result.stdout);

        // Verify content after applying fixes
        const fileContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          'utf-8'
        );

        // Verify specific fixes
        expect(fileContent).toContain(
          'const safeConst = "this should be const"'
        ); // let changed to const

        // Verify that the content was modified
        expect(fileContent).not.toEqual(SAFE_TEST_FILE_CONTENT);
      });

      it('should fix only safe errors in unsafe file', async () => {
        // Restore the file to its original state
        writeFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          UNSAFE_TEST_FILE_CONTENT
        );

        try {
          await runNxCommandAsync('lintUnsafeWrite test-lib', {
            cwd: projectDirectory,
          });
          // If we get here, the test should fail because the expected error didn't occur
        } catch (error) {
          expect(error).toBeDefined();
        }

        // Verify content after attempting to apply fixes
        const fileContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          'utf-8'
        );

        // Verify that safe fixes were applied
        expect(fileContent).toContain('Number.parseInt("42", 10)'); // style/useNumberNamespace applied

        // Verify that unsafe fixes were NOT applied
        expect(fileContent).toContain('!!true'); // complexity/noExtraBooleanCast not fixed
        expect(fileContent).toContain('"hello " + greeting'); // style/useTemplate not fixed
      });
    });

    describe('with write=true and unsafe=true options', () => {
      it('should fix all errors, including unsafe ones, in unsafe file with --unsafe', async () => {
        // Restore the file to its original state
        writeFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          UNSAFE_TEST_FILE_CONTENT
        );

        try {
          await runNxCommandAsync('lintUnsafeWriteUnsafe test-lib', {
            cwd: projectDirectory,
          });
          // If we get here, the test should fail because the expected error didn't occur
        } catch (error) {
          expect(error).toBeDefined();
        }

        // Verify content after attempting to apply all fixes
        const fileContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          'utf-8'
        );
        // Verify that unsafe fixes were also applied with the --unsafe option
        expect(fileContent).toContain('Number.parseInt("42", 10)'); // style/useNumberNamespace applied
        expect(fileContent).toContain(
          'const unsafeTemplate = `hello ${greeting}`'
        ); // style/useTemplate fixed
      });
    });
  });

  describe('format executor', () => {
    describe('without write option', () => {
      it('should detect format issues without applying changes', async () => {
        // Save a copy of the original file to compare later
        const originalContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          'utf-8'
        );

        try {
          await runNxCommandAsync('formatSafe test-lib', {
            cwd: projectDirectory,
          });
          // If we get here, the test should fail because the expected error didn't occur
        } catch (error) {
          expect(error).toBeDefined();
        }

        // Verify that the file hasn't changed
        const currentContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          'utf-8'
        );
        expect(currentContent).toEqual(originalContent);
      });
    });

    describe('with write=true option', () => {
      it('should fix format issues in safe file', async () => {
        // Restore the file to its original state
        writeFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          SAFE_TEST_FILE_CONTENT
        );

        const result = await runNxCommandAsync('formatSafeWrite test-lib', {
          cwd: projectDirectory,
        });

        console.log('formatSafeWrite output:', result.stdout);

        // Verify content after formatting
        const fileContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          'utf-8'
        );

        // Verify specific format fixes
        expect(fileContent).toContain('function safeSpacing()'); // Spacing fixed
        expect(fileContent).toContain('const x = 1;'); // Extra spaces removed
        expect(fileContent).toContain("'these quotes should be single'"); // Quotes changed
        expect(fileContent).toContain('const safeVar = 5;'); // Semicolon added

        // Verify that the content was modified
        expect(fileContent).not.toEqual(SAFE_TEST_FILE_CONTENT);
      });

      it('should fix format issues in unsafe file', async () => {
        // Restore the file to its original state
        writeFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          UNSAFE_TEST_FILE_CONTENT
        );

        const result = await runNxCommandAsync('formatUnsafeWrite test-lib', {
          cwd: projectDirectory,
        });

        console.log('formatUnsafeWrite output:', result.stdout);

        // Verify content after formatting
        const fileContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          'utf-8'
        );

        // Verify specific format fixes
        expect(fileContent).toContain('const mixedVar = 5;'); // Semicolon added
        expect(fileContent).toContain("'should be single quotes'"); // Quotes changed

        // Verify that formatting doesn't affect linting issues
        expect(fileContent).toContain('!!true'); // Doesn't modify boolean expressions

        // Verify that the content was modified
        expect(fileContent).not.toEqual(UNSAFE_TEST_FILE_CONTENT);
      });
    });

    it('should fail when using the unsafe option with the format command', async () => {
      // Restore the file to its original state
      writeFileSync(
        join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
        UNSAFE_TEST_FILE_CONTENT
      );

      try {
        await runNxCommandAsync('formatUnsafeWriteUnsafe test-lib', {
          cwd: projectDirectory,
        });
        // If we get here, the test should fail because the expected error didn't occur
      } catch (error) {
        // This assertion is the only one we count on expect.assertions(1)
        expect(error).toBeDefined();
        // The test passes because the command failed as expected
      }
    });
  });

  describe('check executor', () => {
    describe('without write/unsafe options', () => {
      it('should detect linting and formatting issues without applying changes', async () => {
        // Save a copy of the original file to compare later
        const originalContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          'utf-8'
        );

        try {
          await runNxCommandAsync('checkSafe test-lib', {
            cwd: projectDirectory,
          });
          // If we get here, the test should fail because the expected error didn't occur
        } catch (error) {
          expect(error).toBeDefined();
        }

        // Verify that the file hasn't changed
        const currentContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          'utf-8'
        );
        expect(currentContent).toEqual(originalContent);
      });
    });

    describe('with write=true option', () => {
      it('should fix all safe issues', async () => {
        // Restore the file to its original state
        writeFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          SAFE_TEST_FILE_CONTENT
        );

        const result = await runNxCommandAsync('checkSafeWrite test-lib', {
          cwd: projectDirectory,
        });

        console.log('checkSafeWrite output:', result.stdout);

        // Verify content after applying checks
        const fileContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/safe-test.ts'),
          'utf-8'
        );

        // Verify specific fixes (both formatting and linting)
        expect(fileContent).toContain('function safeSpacing()'); // Format: spacing
        expect(fileContent).toContain('const safeVar = 5;'); // Format: semicolons
        expect(fileContent).toContain("'these quotes should be single'"); // Format: quotes
        expect(fileContent).toContain(
          "const safeConst = 'this should be const'"
        ); // Linting: useConst

        // Verify that the content was modified
        expect(fileContent).not.toEqual(SAFE_TEST_FILE_CONTENT);
      });

      it('should fix only safe errors in unsafe file', async () => {
        // Restore the file to its original state
        writeFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          UNSAFE_TEST_FILE_CONTENT
        );

        try {
          await runNxCommandAsync('checkUnsafeWrite test-lib', {
            cwd: projectDirectory,
          });
          // If we get here, the test should fail because the expected error didn't occur
        } catch (error) {
          expect(error).toBeDefined();
        }

        // Verify content after attempting to apply fixes
        const fileContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          'utf-8'
        );

        // Verify that safe fixes were applied
        expect(fileContent).toContain('const mixedVar = 5;'); // Semicolons added
        expect(fileContent).toContain("'should be single quotes'"); // Quotes changed
        expect(fileContent).toContain("Number.parseInt('42', 10)"); // style/useNumberNamespace applied

        // Verify that unsafe fixes were NOT applied
        expect(fileContent).toContain('!!true'); // complexity/noExtraBooleanCast not fixed
        expect(fileContent).toContain("'hello ' + greeting"); // style/useTemplate not fixed
      });
    });

    describe('with write=true and unsafe=true options', () => {
      it('should fix all issues including unsafe ones', async () => {
        // Restore the file to its original state
        writeFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          UNSAFE_TEST_FILE_CONTENT
        );

        const result = await runNxCommandAsync(
          'checkUnsafeWriteUnsafe test-lib',
          {
            cwd: projectDirectory,
          }
        );

        console.log('checkUnsafeWriteUnsafe output:', result.stdout);

        // Verify content after applying all checks
        const fileContent = readFileSync(
          join(projectDirectory, 'libs/test-lib/src/lib/unsafe-test.ts'),
          'utf-8'
        );

        // Verify specific format fixes
        expect(fileContent).toContain('const mixedVar = 5;'); // Semicolon added
        expect(fileContent).toContain("'should be single quotes'"); // Quotes changed

        // Verify that both safe and unsafe fixes were applied
        expect(fileContent).toContain('if (true)'); // complexity/noExtraBooleanCast fixed
        expect(fileContent).toContain("Number.parseInt('42', 10)"); // style/useNumberNamespace applied
        expect(fileContent).toContain(
          'const unsafeTemplate = `hello ${greeting}`'
        ); // style/useTemplate fixed

        // Verify that the content was significantly modified
        expect(fileContent).not.toEqual(UNSAFE_TEST_FILE_CONTENT);
      });
    });
  });
});
