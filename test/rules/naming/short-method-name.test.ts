import { createRuleTester } from "#test/rule-tester.js";
import { shortMethodNameRule } from "#rules/naming/short-method-name.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("short-method-name", shortMethodNameRule, {
  invalid: [
    {
      code: "class ShortMethod { a(index) {} }",
      errors: [{ data: { minimum: 3, name: "a" }, messageId: "tooShort" }],
    },
    {
      code: "function go() {}",
      errors: [{ data: { minimum: 3, name: "go" }, messageId: "tooShort" }],
    },
  ],
  valid: [
    "function main(index) {}",
    "class ShortMethod { doWork(index) {} }",
    "class ShortMethod { constructor() {} }",
    { code: "class ShortMethod { a() {} }", options: [{ exceptions: "a" }] },
  ],
});
