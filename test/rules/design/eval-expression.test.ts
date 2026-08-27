import { createRuleTester } from "#test/rule-tester.js";
import { evalExpressionRule } from "#rules/design/eval-expression.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("eval-expression", evalExpressionRule, {
  invalid: [
    {
      code: "function bar() { eval('1+1'); }",
      errors: [{ messageId: "evalExpression" }],
    },
    {
      code: "class Foo { bar(param) { if (param === 42) { eval('param = 23'); } } }",
      errors: [{ messageId: "evalExpression" }],
    },
  ],
  valid: ["function bar() { return 42; }", "class Foo { bar() { foo.eval(); } }", "myEval();"],
});
