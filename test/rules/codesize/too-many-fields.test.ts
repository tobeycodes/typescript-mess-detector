import { createRuleTester } from "#test/rule-tester.js";
import { tooManyFieldsRule } from "#rules/codesize/too-many-fields.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("too-many-fields", tooManyFieldsRule, {
  invalid: [
    {
      code: "class Foo { a = 1; b = 2; c = 3; }",
      errors: [{ data: { count: 3, maxfields: 2, name: "Foo" }, messageId: "tooManyFields" }],
      options: [{ maxfields: 2 }],
    },
    {
      // Private/protected fields count too — phpmd's `vars` metric is visibility-agnostic.
      code: "class Foo { private a = 1; protected b = 2; c = 3; }",
      errors: [{ data: { count: 3, maxfields: 2, name: "Foo" }, messageId: "tooManyFields" }],
      options: [{ maxfields: 2 }],
    },
  ],
  valid: [
    { code: "class Foo { a = 1; b = 2; }", options: [{ maxfields: 2 }] },
    "interface Foo { a: number; b: number; }",
  ],
});
