import { constantNamingConventionsRule } from "#rules/naming/constant-naming-conventions.js";
import { createRuleTester } from "#test/rule-tester.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("constant-naming-conventions", constantNamingConventionsRule, {
  invalid: [
    {
      code: "class Foo { static readonly myTest = ''; }",
      errors: [{ data: { name: "myTest" }, messageId: "notUppercase" }],
    },
    {
      code: "enum Foo { myTest }",
      errors: [{ data: { name: "myTest" }, messageId: "notUppercase" }],
    },
  ],
  valid: [
    "class Foo { static readonly MY_NUM = 0; }",
    "class Foo { readonly notConstant = 0; }",
    "class Foo { static mutable = 0; }",
    "enum Foo { MY_NUM }",
  ],
});
