import { booleanGetMethodNameRule } from "#rules/naming/boolean-get-method-name.js";
import { createRuleTester } from "#test/rule-tester.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("boolean-get-method-name", booleanGetMethodNameRule, {
  invalid: [
    {
      code: "class Foo { getFoo(): boolean { return true; } }",
      errors: [{ data: { name: "getFoo" }, messageId: "rename" }],
    },
    {
      code: "class Foo { getFoo(bar: number): boolean { return true; } }",
      errors: [{ data: { name: "getFoo" }, messageId: "rename" }],
    },
  ],
  valid: [
    "class Foo { isFoo(): boolean { return true; } }",
    "class Foo { hasFoo(): boolean { return true; } }",
    "class Foo { getFoo(): string { return ''; } }",
    {
      code: "class Foo { getFoo(bar: number): boolean { return true; } }",
      options: [{ checkParameterizedMethods: true }],
    },
  ],
});
