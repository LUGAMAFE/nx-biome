import { PromiseExecutor } from '@nx/devkit';
import { CheckExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<CheckExecutorSchema> = async (options) => {
  console.log('Executor ran for Check', options);
  return {
    success: true,
  };
};

export default runExecutor;
