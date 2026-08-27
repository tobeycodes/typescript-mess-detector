import { createRuleTester } from "#test/rule-tester.js";
import { longVariableRule } from "#rules/naming/long-variable.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("long-variable", longVariableRule, {
  invalid: [
    {
      code: "const reallyLongIntName = -3;",
      errors: [{ data: { maximum: 10, name: "reallyLongIntName" }, messageId: "tooLong" }],
      options: [{ maximum: 10 }],
    },
    {
      code: "class Foo { protected hungarianUintArrOptions = []; }",
      errors: [{ data: { maximum: 20, name: "hungarianUintArrOptions" }, messageId: "tooLong" }],
    },
    {
      code: "function main(interestingArgumentsList) {}",
      errors: [{ data: { maximum: 20, name: "interestingArgumentsList" }, messageId: "tooLong" }],
    },
  ],
  valid: [
    "const shortName = -3;",
    { code: "const reallyLongIntName = -3;", options: [{ maximum: 30 }] },
    { code: "const reallyLongIntNameSuffix = -3;", options: [{ "subtract-suffixes": "Suffix" }] },
  ],
});
