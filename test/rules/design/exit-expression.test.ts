import { createRuleTester } from "#test/rule-tester.js";
import { exitExpressionRule } from "#rules/design/exit-expression.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("exit-expression", exitExpressionRule, {
  invalid: [
    {
      code: "function bar() { process.exit(1); }",
      errors: [{ messageId: "exitExpression" }],
    },
    {
      code: "class Foo { bar(param) { if (param === 42) { process.exit(23); } } }",
      errors: [{ messageId: "exitExpression" }],
    },
  ],
  valid: [
    "function bar() { return 42; }",
    "class Foo { bar() { process.env.FOO; } }",
    "processCustom.exit();",
    "process.exitCode = 1;",
  ],
});
