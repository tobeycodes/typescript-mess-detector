import { camelCaseClassNameRule } from "#rules/controversial/camelcase-class-name.js";
import { createRuleTester } from "#test/rule-tester.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("camelcase-class-name", camelCaseClassNameRule, {
  invalid: [
    {
      code: "class class_name {}",
      errors: [{ data: { name: "class_name" }, messageId: "notCamelCase" }],
    },
    {
      code: "interface interface_name {}",
      errors: [{ data: { name: "interface_name" }, messageId: "notCamelCase" }],
    },
    {
      code: "class HTMLParser {}",
      errors: [{ data: { name: "HTMLParser" }, messageId: "notCamelCase" }],
      options: [{ "camelcase-abbreviations": true }],
    },
  ],
  valid: ["class ClassName {}", "interface InterfaceName {}", "enum EnumName {}"],
});
