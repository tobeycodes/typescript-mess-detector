import { createRuleTester } from "#test/rule-tester.js";
import { excessivePublicCountRule } from "#rules/codesize/excessive-public-count.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("excessive-public-count", excessivePublicCountRule, {
  invalid: [
    {
      // `x` (public field) + `getX` (public method, no accessibility modifier) = 2 public members.
      code: "class Foo { x = 1; getX() {} }",
      errors: [{ data: { count: 2, minimum: 2, name: "Foo" }, messageId: "tooManyPublicMembers" }],
      options: [{ minimum: 2 }],
    },
    {
      code: "class Foo { public a() {} public b() {} private c() {} }",
      errors: [{ data: { count: 2, minimum: 2, name: "Foo" }, messageId: "tooManyPublicMembers" }],
      options: [{ minimum: 2 }],
    },
  ],
  valid: [
    "class Foo { private a = 1; private b = 2; getX() {} }",
    { code: "class Foo { x = 1; }", options: [{ minimum: 2 }] },
    "interface Foo { a(): void; b(): void; }",
  ],
});
