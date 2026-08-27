import { camelCaseVariableNameRule } from "#rules/controversial/camelcase-variable-name.js";
import { createRuleTester } from "#test/rule-tester.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("camelcase-variable-name", camelCaseVariableNameRule, {
  invalid: [
    {
      code: "function doSomething() { const data_module = 1; }",
      errors: [{ data: { name: "data_module" }, messageId: "notCamelCase" }],
    },
  ],
  valid: [
    "function doSomething() { const dataModule = 1; }",
    {
      code: "function doSomething() { const legacy_name = 1; }",
      options: [{ exceptions: "legacy_name" }],
    },
  ],
});
