# Verdaccio Registry Workaround

This file serves as a reminder to monitor the issue [#30401](https://github.com/nrwl/nx/issues/30401) on the Nx repository.

## Background

There is a known issue where running `npx verdaccio` does not revert the npm registry configuration back to the default after the console is closed (killed). This means that once you stop Verdaccio, npm might still be pointing to the Verdaccio registry.

## What to Do

After running `npx verdaccio` and terminating the process (e.g., by killing the console), make sure to reset the npm registry configuration by running:

    npm config set registry https://registry.npmjs.org/

Then, verify that the registry is correctly set by checking with one of the following commands:

    npm config get registry

or

    npm config list

## Where to Save This File

- Save this file in the root of your project.
- Recommended filename: `README-verdaccio-workaround.md`

Keep this file updated as the issue is monitored for any fixes or changes.
