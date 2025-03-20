import { writeJsonFile } from '@nx/devkit';
import { join } from 'path';

/**
 * Creates Biome configuration file in the specified project directory
 * @param projectDirectory The directory where to create the configuration
 * @returns The path to the created configuration file
 */
export function createBiomeConfig(projectDirectory: string): string {
  const biomeConfigPath = join(projectDirectory, 'biome.json');

  writeJsonFile(biomeConfigPath, {
    $schema: 'https://biomejs.dev/schemas/1.9.4/schema.json',
    vcs: {
      enabled: false,
      clientKind: 'git',
      useIgnoreFile: false,
    },
    files: {
      ignoreUnknown: true,
      ignore: ['**/node_modules/**', '**/dist/**'],
    },
    formatter: {
      enabled: true,
      indentStyle: 'space',
      lineWidth: 100,
    },
    organizeImports: {
      enabled: true,
    },
    linter: {
      enabled: true,
      rules: {
        recommended: false,
        style: {
          useConst: 'error',
          useTemplate: 'error',
          useNumberNamespace: 'error',
        },
        complexity: {
          noExtraBooleanCast: 'error',
        },
      },
    },
    javascript: {
      formatter: {
        quoteStyle: 'single',
        trailingCommas: 'all',
        semicolons: 'always',
      },
    },
  });

  return biomeConfigPath;
}
