import { createRuleTester } from "#test/rule-tester.js";
import { unusedPrivateFieldRule } from "#rules/unusedcode/unused-private-field.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("unused-private-field", unusedPrivateFieldRule, {
  invalid: [
    {
      code: "class Foo { private unused = 1; }",
      errors: [{ data: { name: "unused" }, messageId: "unusedField" }],
    },
    {
      code: "class Foo { private unused = 1; method() { return this.other; } }",
      errors: [{ data: { name: "unused" }, messageId: "unusedField" }],
    },
    {
      code: "class Foo { private static unused = 1; }",
      errors: [{ data: { name: "unused" }, messageId: "unusedField" }],
    },
    {
      code: "class Foo { constructor(private unused: string) {} }",
      errors: [{ data: { name: "unused" }, messageId: "unusedField" }],
    },
  ],
  valid: [
    "class Foo { private used = 1; method() { return this.used; } }",
    // Write-only access still counts as "used" — phpmd doesn't distinguish reads from writes.
    "class Foo { private used = 1; method() { this.used = 2; } }",
    // Read-modify-write (e.g. increment) also counts.
    "class Foo { private j = 6; addOne() { return this.j++; } }",
    // Static fields accessed via the class name.
    "class Foo { private static count = 0; static inc() { return Foo.count++; } }",
    // Constructor parameter properties are a field declaration + assignment in one step.
    "class Foo { constructor(private used: string) { console.log(this.used); } }",
    "class Foo { constructor(private used: string) {} get() { return this.used; } }",
    // Non-private fields are out of scope for this rule.
    "class Foo { public x = 1; }",
    "class Foo { protected x = 1; }",
    // `#private` fields are left to oxlint's built-in `no-unused-private-class-members`.
    "class Foo { #x = 1; }",
    // Decorated fields are skipped — decorators often wire the field up externally.
    "function Input() { return (target: unknown, key: string) => {}; } class Foo { @Input() private x = 1; }",
    // Ambient `declare` fields have no runtime presence of their own.
    "declare class Foo { private x: number; }",
  ],
});
