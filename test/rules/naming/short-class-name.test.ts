import { createRuleTester } from "#test/rule-tester.js";
import { shortClassNameRule } from "#rules/naming/short-class-name.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("short-class-name", shortClassNameRule, {
  invalid: [
    {
      code: "class Fo {}",
      errors: [{ data: { minimum: 3, name: "Fo" }, messageId: "tooShort" }],
    },
    {
      code: "interface Fo {}",
      errors: [{ data: { minimum: 3, name: "Fo" }, messageId: "tooShort" }],
    },
  ],
  valid: [
    "class Foo {}",
    "interface Foo {}",
    { code: "class Fo {}", options: [{ exceptions: "Fo" }] },
  ],
});
