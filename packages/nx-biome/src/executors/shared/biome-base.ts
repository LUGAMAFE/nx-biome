import { ExecutorContext, logger } from '@nx/devkit';
import { execSync } from 'node:child_process';

export interface BiomeBaseOptions {
  filePatterns: string[] | string;
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

    let cmd = `npx biome ${this.command}`;

    if (Array.isArray(filePatterns)) {
      cmd += ` ${filePatterns
        .map((pattern) => {
          // Siempre tratamos las rutas como relativas al root del proyecto
          return `"${pattern}"`;
        })
        .join(' ')}`;
    } else {
      cmd += ` "${filePatterns}"`;
    }
    // @ts-expect-error write puede ser un string o un boolean
    if (write === 'true' || write === true) {
      cmd += ' --write';
    }
    // @ts-expect-error unsafe puede ser un string o un boolean
    if (unsafe === 'true' || unsafe === true) {
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
