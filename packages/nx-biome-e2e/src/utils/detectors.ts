/**
 * Detection functions for Biome tests
 * These functions detect if specific fixes have been applied to file content
 */

/**
 * Types for categorizing fixes
 */
export interface FormatFixes {
  semicolons: boolean;
  quotes: boolean;
  spacing?: boolean;
  extraSpaces?: boolean;
}

export interface LintFixes {
  // Safe fixes
  safe: {
    const?: boolean;
    numberNamespace?: boolean;
  };
  // Unsafe fixes
  unsafe?: {
    booleanCast?: boolean;
    template?: boolean;
  };
}

export interface FileFixes {
  format: FormatFixes;
  lint: LintFixes;
}

/**
 * Detects if specific format fixes were applied to safe file content
 * @param fileContent The content of the file
 * @returns Object with categorized format fixes
 */
export function detectSafeFormatFixes(fileContent: string): FormatFixes {
  return {
    semicolons: fileContent.includes('const safeVar = 5;'),
    quotes: fileContent.includes("'these quotes should be single'"),
    spacing: fileContent.includes('function safeSpacing()'),
    extraSpaces: fileContent.includes('const x = 1;'),
  };
}

/**
 * Detects if specific lint fixes were applied to safe file content
 * @param fileContent The content of the file
 * @returns Object with categorized lint fixes
 */
export function detectSafeLintFixes(fileContent: string): LintFixes {
  return {
    safe: {
      const: fileContent.includes('const safeConst ='),
    },
    // No unsafe fixes for safe files
  };
}

/**
 * Detects if specific format fixes were applied to unsafe file content
 * @param fileContent The content of the file
 * @returns Object with categorized format fixes
 */
export function detectUnsafeFormatFixes(fileContent: string): FormatFixes {
  return {
    // Safe format fixes
    semicolons: fileContent.includes('const mixedVar = 5;'),
    quotes: fileContent.includes("'should be single quotes'"),
  };
}

/**
 * Detects if specific lint fixes were applied to unsafe file content
 * @param fileContent The content of the file
 * @returns Object with categorized lint fixes
 */
export function detectUnsafeLintFixes(fileContent: string): LintFixes {
  return {
    safe: {
      // Safe lint fixes
      numberNamespace: fileContent.includes('Number.parseInt'),
    },
    unsafe: {
      // Unsafe lint fixes
      booleanCast: fileContent.includes('if (true)'),
      template: fileContent.includes('`hello ${greeting}`'),
    },
  };
}

/**
 * Combined detection for all fixes in a safe file
 * @param fileContent The content of the file
 * @returns Object with categorized fixes
 */
export function detectSafeFileFixes(fileContent: string): FileFixes {
  return {
    format: detectSafeFormatFixes(fileContent),
    lint: detectSafeLintFixes(fileContent),
  };
}

/**
 * Combined detection for all fixes in an unsafe file
 * @param fileContent The content of the file
 * @returns Object with categorized fixes
 */
export function detectUnsafeFileFixes(fileContent: string): FileFixes {
  return {
    format: detectUnsafeFormatFixes(fileContent),
    lint: detectUnsafeLintFixes(fileContent),
  };
}
