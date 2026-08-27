import { countInLoopExpressionRule } from "#rules/design/count-in-loop-expression.js";
import { createRuleTester } from "#test/rule-tester.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("count-in-loop-expression", countInLoopExpressionRule, {
  invalid: [
    {
      code: "for (let i = 0; i < Object.keys(obj).length; i++) {}",
      errors: [{ data: { expression: "Object.keys(obj).length" }, messageId: "countInLoop" }],
    },
    {
      code: "let i = 0; while (i < Array.from(obj).length) { i++; }",
      errors: [{ data: { expression: "Array.from(obj).length" }, messageId: "countInLoop" }],
    },
    {
      code: "let i = 0; do { i++; } while (i < arr.filter(fn).length);",
      errors: [{ data: { expression: "arr.filter(fn).length" }, messageId: "countInLoop" }],
    },
  ],
  valid: [
    "for (let i = 0; i < array.length; i++) {}",
    "let i = 0; while (i < array.length) { i++; }",
    "const len = Object.keys(obj).length; for (let i = 0; i < len; i++) {}",
  ],
});
