/**
 * This script starts a local registry for e2e testing purposes.
 * It is meant to be called in jest's globalSetup.
 */

// Import the type from a local type.d.ts file
import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releasePublish, releaseVersion } from 'nx/release';

// We don't declare stopLocalRegistry here - it's already declared in registry.d.ts

export default async () => {
  // local registry target to run
  const localRegistryTarget = '@nx-biome/source:local-registry';
  // storage folder for the local registry
  const storage = './tmp/local-registry/storage';

  // Start the local registry with more debugging options
  global.stopLocalRegistry = await startLocalRegistry({
    localRegistryTarget,
    storage,
    verbose: true, // Changed to true to see more debugging information
    listenAddress: '0.0.0.0', // Use 0.0.0.0 instead of localhost
  });

  try {
    // Create a version for e2e testing
    await releaseVersion({
      specifier: '0.0.0-e2e',
      stageChanges: false,
      gitCommit: false,
      gitTag: false,
      firstRelease: true,
      generatorOptionsOverrides: {
        currentVersionResolver: 'registry',
        skipLockFileUpdate: true,
      },
      projects: ['nx-biome'], // Explicitly specify the project
    });

    // Publish to the local registry
    await releasePublish({
      tag: 'e2e',
      firstRelease: true,
      registry: 'http://0.0.0.0:4873', // Use 0.0.0.0 instead of localhost
      projects: ['nx-biome'], // Explicitly specify the project
    });

    console.log('✅ Local registry setup completed successfully');
  } catch (error) {
    console.error('❌ Error setting up local registry:', error);
    // Make sure the process fails if there's an error
    process.exit(1);
  }
};
