import { PromiseExecutor } from '@nx/devkit';
import { BiomeExecutorBase } from '../shared/biome-base';
import { LintExecutorSchema } from './schema';

class LintExecutor extends BiomeExecutorBase<LintExecutorSchema> {
  protected command = 'lint';
}

const runExecutor: PromiseExecutor<LintExecutorSchema> = async (options, context) => {
  const executor = new LintExecutor(options, context);
  return executor.execute();
};

export default runExecutor;
