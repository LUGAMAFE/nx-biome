import { ExecutorContext, logger } from '@nx/devkit';
import { execSync } from 'node:child_process';

export interface BiomeBaseOptions {
  filePatterns: string[];
  write?: boolean;
  unsafe?: boolean;
}

export abstract class BiomeExecutorBase<T extends BiomeBaseOptions> {
  protected abstract command: string;

  constructor(
    protected readonly options: T,
    protected readonly context: ExecutorContext
  ) {}

  protected buildCommand(): string {
    const { filePatterns, write, unsafe } = this.options;
    const projectRoot = this.context.root;

    let cmd = `npx biome ${this.command}`;

    if (filePatterns?.length) {
      cmd += ` ${filePatterns
        .map((pattern) => `"${projectRoot}/${pattern}"`)
        .join(' ')}`;
    }

    if (write) {
      cmd += ' --write';
    }

    if (unsafe) {
      cmd += ' --unsafe';
    }

    return cmd;
  }

  async execute() {
    try {
      execSync(this.buildCommand(), {
        cwd: this.context.root,
        stdio: 'inherit',
      });
      return { success: true };
    } catch (error) {
      logger.error(`Biome ${this.command} failed: ${error}`);
      return { success: false };
    }
  }
}