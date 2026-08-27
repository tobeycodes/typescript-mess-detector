import { booleanArgumentFlagRule } from "#rules/cleancode/boolean-argument-flag.js";
import { createRuleTester } from "#test/rule-tester.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("boolean-argument-flag", booleanArgumentFlagRule, {
  invalid: [
    {
      code: "function bar(flag = true) {}",
      errors: [{ data: { name: "bar", param: "flag" }, messageId: "booleanFlag" }],
    },
    {
      code: "function bar(flag = false) {}",
      errors: [{ data: { name: "bar", param: "flag" }, messageId: "booleanFlag" }],
    },
    {
      code: "class Foo { bar(flag = true) {} }",
      errors: [{ data: { name: "bar", param: "flag" }, messageId: "booleanFlag" }],
    },
    {
      code: "const bar = (flag = true) => {};",
      errors: [{ data: { name: "bar", param: "flag" }, messageId: "booleanFlag" }],
    },
    {
      code: "function bar(flag: boolean) {}",
      errors: [{ data: { name: "bar", param: "flag" }, messageId: "booleanFlag" }],
    },
  ],
  valid: [
    "function bar(flag) {}",
    "function bar(flag = 'yes') {}",
    "function bar(count = 3) {}",
    { code: "class Foo { bar(flag = true) {} }", options: [{ exceptions: "Foo" }] },
    { code: "function create(flag = true) {}", options: [{ ignorepattern: "^create" }] },
  ],
});
