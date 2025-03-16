import { PromiseExecutor } from '@nx/devkit';
import { BiomeExecutorBase } from '../shared/biome-base';
import { FormatExecutorSchema } from './schema';

class FormatExecutor extends BiomeExecutorBase<FormatExecutorSchema> {
  protected command = 'format';
}

const runExecutor: PromiseExecutor<FormatExecutorSchema> = async (options, context) => {
  const executor = new FormatExecutor(options, context);
  return executor.execute();
};

export default runExecutor;
