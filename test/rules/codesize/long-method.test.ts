import { createRuleTester } from "#test/rule-tester.js";
import { longMethodRule } from "#rules/codesize/long-method.js";

const blankLineBody = "function f() {\n\n  a();\n\n  b();\n\n}";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("long-method", longMethodRule, {
  invalid: [
    {
      // Loc = 7 lines total; at a minimum of 7.
      code: blankLineBody,
      errors: [
        { data: { kind: "function", lines: 7, minimum: 7, name: "f" }, messageId: "tooLong" },
      ],
      options: [{ minimum: 7 }],
    },
    {
      // Eloc = 4 non-blank lines; at a minimum of 4.
      code: blankLineBody,
      errors: [
        { data: { kind: "function", lines: 4, minimum: 4, name: "f" }, messageId: "tooLong" },
      ],
      options: [{ "ignore-whitespace": true, minimum: 4 }],
    },
    {
      // The method's own span runs from `bar() {` through the line closing its body: 5 lines total.
      code: "class Foo { bar() {\n  a();\n  b();\n  c();\n} }",
      errors: [
        { data: { kind: "method", lines: 5, minimum: 5, name: "bar" }, messageId: "tooLong" },
      ],
      options: [{ minimum: 5 }],
    },
  ],
  valid: [
    // Function spans fewer lines than the default threshold of 100.
    `function short() {
      const a = 1;
      return a;
    }`,
    // Loc = 7 lines total; below a minimum of 8.
    { code: blankLineBody, options: [{ minimum: 8 }] },
    // Eloc = 4 non-blank lines; below a minimum of 5.
    { code: blankLineBody, options: [{ "ignore-whitespace": true, minimum: 5 }] },
    "declare function overload(a: number): void;",
  ],
});
