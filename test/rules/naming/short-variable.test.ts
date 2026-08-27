import { createRuleTester } from "#test/rule-tester.js";
import { shortVariableRule } from "#rules/naming/short-variable.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("short-variable", shortVariableRule, {
  invalid: [
    {
      code: "const q = 15;",
      errors: [{ data: { minimum: 3, name: "q" }, messageId: "tooShort" }],
    },
    {
      code: "class Something { private q = 15; }",
      errors: [{ data: { minimum: 3, name: "q" }, messageId: "tooShort" }],
    },
    {
      code: "function main(a) {}",
      errors: [{ data: { minimum: 3, name: "a" }, messageId: "tooShort" }],
    },
    {
      code: "const q = 15;",
      errors: [{ data: { minimum: 5, name: "q" }, messageId: "tooShort" }],
      options: [{ minimum: 5 }],
    },
  ],
  valid: [
    "const index = 0;",
    "class Something { private count = 5; }",
    "function main(callback) {}",
    "for (let i = 0; i < 10; i++) {}",
    "try {} catch (e) {}",
    { code: "const q = 15;", options: [{ exceptions: "q" }] },
  ],
});
