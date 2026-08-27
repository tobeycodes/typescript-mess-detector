import { createRuleTester } from "#test/rule-tester.js";
import { excessiveClassComplexityRule } from "#rules/codesize/excessive-class-complexity.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("excessive-class-complexity", excessiveClassComplexityRule, {
  invalid: [
    {
      // WMC = 2 + 2 = 4, at or above a maximum of 3.
      code: "class Foo { a(x) { if (x) {} } b(x) { if (x) {} } }",
      errors: [{ data: { complexity: 4, maximum: 3, name: "Foo" }, messageId: "tooComplex" }],
      options: [{ maximum: 3 }],
    },
  ],
  valid: [
    // Two methods, each complexity 2 (base 1 + one `if`): WMC = 4, below a maximum of 5.
    { code: "class Foo { a(x) { if (x) {} } b(x) { if (x) {} } }", options: [{ maximum: 5 }] },
  ],
});
