import { camelCaseMethodNameRule } from "#rules/controversial/camelcase-method-name.js";
import { createRuleTester } from "#test/rule-tester.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("camelcase-method-name", camelCaseMethodNameRule, {
  invalid: [
    {
      code: "class ClassName { get_name() {} }",
      errors: [{ data: { name: "get_name" }, messageId: "notCamelCase" }],
    },
    {
      code: "class ClassName { getHTTPResponse() {} }",
      errors: [{ data: { name: "getHTTPResponse" }, messageId: "notCamelCase" }],
      options: [{ "camelcase-abbreviations": true }],
    },
  ],
  valid: [
    "class ClassName { getName() {} }",
    "class ClassName { constructor() {} }",
    { code: "class ClassName { _getName() {} }", options: [{ "allow-underscore": true }] },
    { code: "class ClassName { testFoo_bar() {} }", options: [{ "allow-underscore-test": true }] },
  ],
});
