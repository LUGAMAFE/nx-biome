import { PromiseExecutor } from '@nx/devkit';
import { LintExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<LintExecutorSchema> = async (options) => {
  console.log('Executor ran for Lint', options);
  return {
    success: true,
  };
};

export default runExecutor;
