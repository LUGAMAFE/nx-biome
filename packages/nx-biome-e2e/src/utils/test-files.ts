// Test file with only errors that are safe to fix (can be automatically corrected)
export const SAFE_TEST_FILE_CONTENT = `
    // FORMAT: javascript.formatter.semicolons="always" - Missing semicolons (safe fix)
    const safeVar = 5

    // FORMAT: javascript.formatter.quoteStyle="single" - Incorrect quotes (safe fix)
    const safeQuotes = "these quotes should be single"

    // FORMAT: javascript.formatter.indentStyle="space" - Incorrect spacing (safe fix)
    function safeSpacing(  ) {
      const   x   =  1
      return x
    }

    // LINT: style/useConst - Use const instead of let when there's no reassignment (safe fix)
    let safeConst = "this should be const"

    // FORMAT: javascript.formatter.semicolons="always" - Missing semicolon (safe fix)
    const safeSemicolon = true
`;

// Test file with mixed errors (safe and unsafe to fix)
export const UNSAFE_TEST_FILE_CONTENT = `
    // SAFE FORMAT: javascript.formatter.semicolons="always" - Missing semicolons (safe fix)
    const mixedVar = 5

    // UNSAFE LINT: complexity/noExtraBooleanCast - Extra boolean cast (unsafe fix)
    if (!!true) {
      console.log("test")
    }

    // SAFE FORMAT: javascript.formatter.quoteStyle="single" - Incorrect quotes (safe fix)
    const mixedQuotes = "should be single quotes"

    // LINT: style/useNumberNamespace - Use Number.parseInt instead of global parseInt (safe fix)
    const safeNamespace = parseInt("42", 10);

    // UNSAFE LINT: style/useTemplate - String concatenation with variables (unsafe fix)
    const greeting = "world";
    const unsafeTemplate = "hello " + greeting
`;
