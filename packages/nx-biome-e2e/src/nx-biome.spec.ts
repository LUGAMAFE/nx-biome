import { getPackageManagerCommand, writeJsonFile } from '@nx/devkit';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  checkFilesExist,
  createTestProject,
  readJson,
  runNxCommandAsync
} from './utils/testing';

describe('nx-biome e2e', () => {
  let projectDirectory: string;
  let testFilePath: string;
  let originalContent: string;

  const TEST_FILE_CONTENT = `
    function test(  ) {
      console.log("test");
      return true;
    }

    export const someFunction = (  a:string,b:number   )=> {
      return a + b;
    }
  `;

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

    // Generate a JS library using our runNxCommandAsync utility
    const libName = 'test-lib';
    await runNxCommandAsync(
      `g @nx/js:library ${libName} --directory=libs/test-lib --bundler=none --linter=none --unitTestRunner=jest --no-interactive`,
      { cwd: projectDirectory }
    );

    // Create a test file with some content that needs formatting
    testFilePath = join(projectDirectory, 'libs/test-lib/src/lib/test.ts');
    writeFileSync(testFilePath, TEST_FILE_CONTENT);
    originalContent = TEST_FILE_CONTENT;

    // Setup Biome configuration
    const biomeConfigPath = join(projectDirectory, 'biome.json');
    writeJsonFile(biomeConfigPath, {
      "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
      "vcs": {
        "enabled": false,
        "clientKind": "git",
        "useIgnoreFile": false
      },
      "files": {
        "ignoreUnknown": false,
        "ignore": ["**/node_modules/**", "**/dist/**"]
      },
      "formatter": {
        "enabled": true,
        "indentStyle": "space",
        "lineWidth": 100
      },
      "organizeImports": {
        "enabled": true
      },
      "linter": {
        "enabled": true,
        "rules": {
          "recommended": true
        }
      },
      "javascript": {
        "formatter": {
          "quoteStyle": "single",
          "trailingComma": "all"
        }
      }
    });

    // Update project.json to add Biome executors
    const projectJsonPath = join(projectDirectory, 'libs/test-lib/project.json');
    const projectJson = readJson(projectJsonPath);

    projectJson.targets = {
      ...projectJson.targets,
      lint: {
        executor: '@LUGAMAFE/nx-biome:lint',
        options: {
          filePatterns: ['src/**/*.ts']
        }
      },
      format: {
        executor: '@LUGAMAFE/nx-biome:format',
        options: {
          filePatterns: ['src/**/*.ts']
        }
      },
      check: {
        executor: '@LUGAMAFE/nx-biome:check',
        options: {
          filePatterns: ['src/**/*.ts']
        }
      }
    };

    writeJsonFile(projectJsonPath, projectJson);

    // Verify files exist
    expect(() =>
      checkFilesExist(
        'biome.json',
        'libs/test-lib/project.json'
      )
    ).not.toThrow();
  });

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
    it('should run lint command and detect issues', async () => {
      try {
        await runNxCommandAsync('lint test-lib', { cwd: projectDirectory });
        fail('Expected lint to fail due to formatting issues');
      } catch (error) {
        expect(error.message).toContain('Command failed');
      }
    });

    it('should fix issues when using write option', async () => {
      const result = await runNxCommandAsync('lint test-lib --write', {
        cwd: projectDirectory,
      });

      expect(result.stdout).toContain('Successfully ran target lint');

      // Verify the file was fixed
      const fileContent = readFileSync(testFilePath, 'utf-8');
      expect(fileContent).toContain('function test()');
      expect(fileContent).toContain('(a: string, b: number)');
    });
  });

  describe('format executor', () => {
    it('should detect formatting issues', async () => {
      try {
        await runNxCommandAsync('format test-lib', { cwd: projectDirectory });
        fail('Expected format to fail due to formatting issues');
      } catch (error) {
        expect(error.message).toContain('Command failed');
      }
    });

    it('should fix formatting when using write option', async () => {
      const result = await runNxCommandAsync('format test-lib --write', {
        cwd: projectDirectory,
      });

      expect(result.stdout).toContain('Successfully ran target format');

      // Verify the file was formatted
      const fileContent = readFileSync(testFilePath, 'utf-8');
      expect(fileContent).toContain('function test()');
      expect(fileContent).not.toContain('function test(  )');
    });
  });

  describe('check executor', () => {
    it('should detect issues', async () => {
      try {
        await runNxCommandAsync('check test-lib', { cwd: projectDirectory });
        fail('Expected check to fail due to issues');
      } catch (error) {
        expect(error.message).toContain('Command failed');
      }
    });

    it('should fix issues when using write option', async () => {
      const result = await runNxCommandAsync('check test-lib --write', {
        cwd: projectDirectory,
      });

      expect(result.stdout).toContain('Successfully ran target check');

      // Verify issues were fixed
      const verifyResult = await runNxCommandAsync('check test-lib', {
        cwd: projectDirectory,
      });

      expect(verifyResult.stdout).toContain('Successfully ran target check');
    });
  });
});
