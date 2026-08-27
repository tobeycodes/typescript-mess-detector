import { createRuleTester } from "#test/rule-tester.js";
import { elseExpressionRule } from "#rules/cleancode/else-expression.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("else-expression", elseExpressionRule, {
  invalid: [
    {
      code: "function bar(flag) { if (flag) { return 1; } else { return 2; } }",
      errors: [{ messageId: "elseExpression" }],
    },
    {
      code: "function bar(flag) { if (flag) { return 1; } else if (!flag) { return 2; } else { return 3; } }",
      errors: [{ messageId: "elseExpression" }],
    },
  ],
  valid: [
    "function bar(flag) { if (flag) { return 1; } return 2; }",
    "function bar(flag) { if (flag) { return 1; } else if (!flag) { return 2; } }",
  ],
});
