import { camelCasePropertyNameRule } from "#rules/controversial/camelcase-property-name.js";
import { createRuleTester } from "#test/rule-tester.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("camelcase-property-name", camelCasePropertyNameRule, {
  invalid: [
    {
      code: "class ClassName { property_name = 1; }",
      errors: [{ data: { name: "property_name" }, messageId: "notCamelCase" }],
    },
  ],
  valid: [
    "class ClassName { propertyName = 1; }",
    { code: "class ClassName { _propertyName = 1; }", options: [{ "allow-underscore": true }] },
  ],
});
