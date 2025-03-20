# nx-biome

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build nx-biome` to build the library.

## Running unit tests

Run `nx test nx-biome` to execute the unit tests via [Jest](https://jestjs.io).

## Usage

### Format Command

You can use the format executor with the following options:

```bash
# Basic usage
nx format yourProjectName

# With write flag to apply changes
nx format yourProjectName --write

# With unsafe flag to allow unsafe operations
nx format yourProjectName --unsafe

# Combine both flags
nx format yourProjectName --write --unsafe
```

### Lint Command

Similarly for the lint command:

```bash
# Basic usage
nx lint yourProjectName

# With write flag to apply fixes
nx lint yourProjectName --write

# With unsafe flag
nx lint yourProjectName --write --unsafe
```

### Check Command

For check command:

```bash
# Basic usage
nx check yourProjectName

# With write and unsafe flags
nx check yourProjectName --write --unsafe
```

### Overriding Default Flags

If an executor has `--write` or `--unsafe` flags configured as `true` by default in your project configuration, you can override them using the `--no-write` or `--no-verify` flags:

```bash
# Override default write=true configuration
nx format yourProjectName --no-write

# Override default unsafe=true configuration
nx lint yourProjectName --no-verify

# Override both default configurations
nx check yourProjectName --no-write --no-verify
```

### Default Executor Configuration Example

Here's an example of how an executor might be configured with default flags in your `project.json` file:

```json
{
  "projects": {
    "your-project": {
      "targets": {
        "format": {
          "executor": "@LUGAMAFE/nx-biome:format",
          "options": {
            "write": true,
            "unsafe": true
          }
        },
        "lint": {
          "executor": "@LUGAMAFE/nx-biome:lint",
          "options": {
            "write": true
          }
        }
      }
    }
  }
}
```

With this configuration, the `format` command would run with both `--write` and `--unsafe` enabled by default, and you would need to use `--no-write` or `--no-verify` to disable them.
