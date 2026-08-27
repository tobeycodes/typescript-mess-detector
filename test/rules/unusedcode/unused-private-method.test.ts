import { createRuleTester } from "#test/rule-tester.js";
import { unusedPrivateMethodRule } from "#rules/unusedcode/unused-private-method.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("unused-private-method", unusedPrivateMethodRule, {
  invalid: [
    {
      code: "class Foo { private unused() {} }",
      errors: [{ data: { name: "unused" }, messageId: "unusedMethod" }],
    },
    {
      code: "class Foo { private unused() {} public call() { return this.other(); } }",
      errors: [{ data: { name: "unused" }, messageId: "unusedMethod" }],
    },
    {
      code: "class Foo { private static unused() {} }",
      errors: [{ data: { name: "unused" }, messageId: "unusedMethod" }],
    },
  ],
  valid: [
    "class Foo { private used() {} public call() { return this.used(); } }",
    // Referenced without being called (e.g. bound as a callback) still counts as used.
    "class Foo { private used() {} public call() { return this.used.bind(this); } }",
    // Static methods accessed via the class name.
    "class Foo { private static helper() {} static run() { return Foo.helper(); } }",
    // Constructors are always excluded (no phpmd __construct/__destruct/__clone analog needed).
    "class Foo { constructor() {} }",
    "class Foo { private constructor() {} }",
    // Non-private methods are out of scope for this rule.
    "class Foo { public helper() {} }",
    "class Foo { protected helper() {} }",
    // `#private` methods are left to oxlint's built-in `no-unused-private-class-members`.
    "class Foo { #helper() {} }",
    // Decorated methods are skipped — decorators often wire the method up externally.
    "function Bound() { return (target: unknown, key: string) => {}; } class Foo { @Bound() private helper() {} }",
  ],
});
