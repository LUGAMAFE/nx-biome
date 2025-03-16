import { PromiseExecutor } from '@nx/devkit';
import { FormatExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<FormatExecutorSchema> = async (options) => {
  console.log('Executor ran for Format', options);
  return {
    success: true,
  };
};

export default runExecutor;
