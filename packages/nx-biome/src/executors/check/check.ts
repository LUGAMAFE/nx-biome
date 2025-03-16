import { PromiseExecutor } from '@nx/devkit';
import { BiomeExecutorBase } from '../shared/biome-base';
import { CheckExecutorSchema } from './schema';

class CheckExecutor extends BiomeExecutorBase<CheckExecutorSchema> {
  protected command = 'check';
}

const runExecutor: PromiseExecutor<CheckExecutorSchema> = async (options, context) => {
  const executor = new CheckExecutor(options, context);
  return executor.execute();
};

export default runExecutor;
