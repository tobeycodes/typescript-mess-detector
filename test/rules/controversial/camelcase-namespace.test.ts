import { camelCaseNamespaceRule } from "#rules/controversial/camelcase-namespace.js";
import { createRuleTester } from "#test/rule-tester.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("camelcase-namespace", camelCaseNamespaceRule, {
  invalid: [
    {
      code: "namespace Example.name_space {}",
      errors: [
        {
          data: { name: "name_space", namespace: "Example.name_space" },
          messageId: "notCamelCase",
        },
      ],
    },
    {
      code: "namespace not_camel {}",
      errors: [{ data: { name: "not_camel", namespace: "not_camel" }, messageId: "notCamelCase" }],
    },
  ],
  valid: [
    "namespace Foo {}",
    "namespace Foo.Bar {}",
    { code: "namespace foo {}", options: [{ exceptions: "foo" }] },
  ],
});
