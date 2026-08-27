import { camelCaseParameterNameRule } from "#rules/controversial/camelcase-parameter-name.js";
import { createRuleTester } from "#test/rule-tester.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("camelcase-parameter-name", camelCaseParameterNameRule, {
  invalid: [
    {
      code: "class ClassName { doSomething(user_name) {} }",
      errors: [{ data: { name: "user_name" }, messageId: "notCamelCase" }],
    },
    {
      code: "function doSomething(user_name) {}",
      errors: [{ data: { name: "user_name" }, messageId: "notCamelCase" }],
    },
  ],
  valid: ["function doSomething(userName) {}", "class ClassName { doSomething(userName) {} }"],
});
