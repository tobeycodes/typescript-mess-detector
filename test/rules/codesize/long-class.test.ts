import { createRuleTester } from "#test/rule-tester.js";
import { longClassRule } from "#rules/codesize/long-class.js";

const blankLineClass = "class Foo {\n\n  a() {}\n\n  b() {}\n\n}";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("long-class", longClassRule, {
  invalid: [
    {
      // Loc = 7 lines total; at a minimum of 7.
      code: blankLineClass,
      errors: [{ data: { lines: 7, minimum: 7, name: "Foo" }, messageId: "tooLong" }],
      options: [{ minimum: 7 }],
    },
    {
      // Eloc = 4 non-blank lines; at a minimum of 4.
      code: blankLineClass,
      errors: [{ data: { lines: 4, minimum: 4, name: "Foo" }, messageId: "tooLong" }],
      options: [{ "ignore-whitespace": true, minimum: 4 }],
    },
  ],
  valid: [
    "class Foo { a() {} b() {} }",
    "interface Foo { a(): void; }",
    // Loc = 7 lines total; below a minimum of 8.
    { code: blankLineClass, options: [{ minimum: 8 }] },
    // Eloc = 4 non-blank lines; below a minimum of 5.
    { code: blankLineClass, options: [{ "ignore-whitespace": true, minimum: 5 }] },
  ],
});
