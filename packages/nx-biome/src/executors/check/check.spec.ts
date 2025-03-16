import { ExecutorContext } from '@nx/devkit';
import { execSync } from 'node:child_process';
import executor from './check';
import { CheckExecutorSchema } from './schema';

// Mock execSync
jest.mock('node:child_process', () => ({
  execSync: jest.fn(),
}));

describe('Check Executor', () => {
  let options: CheckExecutorSchema;
  let context: ExecutorContext;

  beforeEach(() => {
    options = {
      filePatterns: ['src/**/*.ts'],
    };
    context = {
      root: '/root/project',
      cwd: process.cwd(),
      isVerbose: false,
      projectGraph: {
        nodes: {},
        dependencies: {},
      },
      projectsConfigurations: {
        projects: {},
        version: 2,
      },
      nxJsonConfiguration: {},
    };
    jest.clearAllMocks();
  });

  it('should run check command with basic options', async () => {
    const output = await executor(options, context);

    expect(execSync).toHaveBeenCalledWith(
      'npx biome check "/root/project/src/**/*.ts"',
      expect.any(Object)
    );
    expect(output.success).toBe(true);
  });

  it('should add write flag when write option is true', async () => {
    options.write = true;

    await executor(options, context);

    expect(execSync).toHaveBeenCalledWith(
      'npx biome check "/root/project/src/**/*.ts" --write',
      expect.any(Object)
    );
  });

  it('should add unsafe flag when unsafe option is true', async () => {
    options.unsafe = true;

    await executor(options, context);

    expect(execSync).toHaveBeenCalledWith(
      'npx biome check "/root/project/src/**/*.ts" --unsafe',
      expect.any(Object)
    );
  });

  it('should handle multiple file patterns', async () => {
    options.filePatterns = ['src/**/*.ts', 'test/**/*.ts'];

    await executor(options, context);

    expect(execSync).toHaveBeenCalledWith(
      'npx biome check "/root/project/src/**/*.ts" "/root/project/test/**/*.ts"',
      expect.any(Object)
    );
  });

  it('should return failure when command throws', async () => {
    (execSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Command failed');
    });

    const output = await executor(options, context);

    expect(output.success).toBe(false);
  });
});
