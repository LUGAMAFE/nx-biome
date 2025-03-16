import { execSync } from 'child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

describe('nx-biome', () => {
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

  beforeAll(() => {
    projectDirectory = createTestProject();

    // Install the plugin from the local Verdaccio registry
    // The plugin is automatically published to Verdaccio by Nx during e2e tests
    execSync('npm install -D nx-biome@0.0.1 @nx/js', {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_registry: 'http://localhost:4873'
      }
    });

    // Generate a JS library
    execSync('npx nx g @nx/js:library test-lib --bundler=none --linter=none --unitTestRunner=jest --no-interactive', {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });

    // Create a test file with some content that needs formatting
    testFilePath = join(projectDirectory, 'libs/test-lib/src/lib/test.ts');
    writeFileSync(testFilePath, TEST_FILE_CONTENT);
    originalContent = TEST_FILE_CONTENT;

    // Setup Biome configuration
    const biomeConfigPath = join(projectDirectory, 'biome.json');
    writeFileSync(biomeConfigPath, JSON.stringify({
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
    }, null, 2));

    // Update project.json to add Biome executors
    const projectJsonPath = join(projectDirectory, 'libs/test-lib/project.json');
    const projectJson = JSON.parse(readFileSync(projectJsonPath, 'utf-8'));

    projectJson.targets = {
      ...projectJson.targets,
      lint: {
        executor: 'nx-biome:lint',
        options: {
          filePatterns: ['src/**/*.ts']
        }
      },
      format: {
        executor: 'nx-biome:format',
        options: {
          filePatterns: ['src/**/*.ts']
        }
      },
      check: {
        executor: 'nx-biome:check',
        options: {
          filePatterns: ['src/**/*.ts']
        }
      }
    };

    writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2));
  });

  beforeEach(() => {
    // Restore the file to its original state before each test
    writeFileSync(testFilePath, originalContent);
  });

  afterAll(() => {
    if (projectDirectory) {
      rmSync(projectDirectory, { recursive: true, force: true });
    }
  });

  it('should be installed', () => {
    execSync('npm ls nx-biome', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
  });

  describe('lint executor', () => {
    it('should run lint command and detect issues', () => {
      try {
        execSync('npx nx lint test-lib', {
          cwd: projectDirectory,
          encoding: 'utf-8',
        });
        fail('Expected lint to fail due to formatting issues');
      } catch (error) {
        expect(error.message).toContain('Command failed');
      }
    });

    it('should fix issues when using write option', () => {
      execSync('npx nx lint test-lib --write', {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });

      // Verify the file was fixed
      const fileContent = readFileSync(testFilePath, 'utf-8');
      expect(fileContent).toContain('function test()');
      expect(fileContent).toContain('(a: string, b: number)');
    });
  });

  describe('format executor', () => {
    it('should detect formatting issues', () => {
      try {
        execSync('npx nx format test-lib', {
          cwd: projectDirectory,
          encoding: 'utf-8',
        });
        fail('Expected format to fail due to formatting issues');
      } catch (error) {
        expect(error.message).toContain('Command failed');
      }
    });

    it('should fix formatting when using write option', () => {
      execSync('npx nx format test-lib --write', {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });

      // Verify the file was formatted
      const fileContent = readFileSync(testFilePath, 'utf-8');
      expect(fileContent).toContain('function test()');
      expect(fileContent).not.toContain('function test(  )');
    });
  });

  describe('check executor', () => {
    it('should detect issues', () => {
      try {
        execSync('npx nx check test-lib', {
          cwd: projectDirectory,
          encoding: 'utf-8',
        });
        fail('Expected check to fail due to issues');
      } catch (error) {
        expect(error.message).toContain('Command failed');
      }
    });

    it('should fix issues when using write option', () => {
      execSync('npx nx check test-lib --write', {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });

      // Verify issues were fixed
      const output = execSync('npx nx check test-lib', {
        cwd: projectDirectory,
        encoding: 'utf-8',
      });
      expect(output).toBeDefined();
    });
  });
});

/**
 * Creates a test project with create-nx-workspace and installs the plugin
 * @returns The directory where the test project was created
 */
function createTestProject() {
  const projectName = 'test-project';
  const projectDirectory = join(process.cwd(), 'tmp', projectName);

  rmSync(projectDirectory, { recursive: true, force: true });
  mkdirSync(dirname(projectDirectory), { recursive: true });

  execSync(
    `npx create-nx-workspace@latest ${projectName} --preset npm --nxCloud=skip --no-interactive`,
    {
      cwd: dirname(projectDirectory),
      stdio: 'inherit',
      env: process.env,
    }
  );

  return projectDirectory;
}
