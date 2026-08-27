import { createRuleTester } from "#test/rule-tester.js";
import { longParameterListRule } from "#rules/codesize/long-parameter-list.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("long-parameter-list", longParameterListRule, {
  invalid: [
    {
      code: "function ten(a, b, c, d, e, f, g, h, i, j) {}",
      errors: [
        {
          data: { count: 10, kind: "function", minimum: 10, name: "ten" },
          messageId: "tooManyParameters",
        },
      ],
    },
    {
      code: "class Foo { bar(a, b, c, d, e) {} }",
      errors: [
        {
          data: { count: 5, kind: "method", minimum: 5, name: "bar" },
          messageId: "tooManyParameters",
        },
      ],
      options: [{ minimum: 5 }],
    },
    {
      code: "const fn = (a, b, c) => {};",
      errors: [
        {
          data: { count: 3, kind: "function", minimum: 3, name: "fn" },
          messageId: "tooManyParameters",
        },
      ],
      options: [{ minimum: 3 }],
    },
  ],
  valid: [
    "function nine(a, b, c, d, e, f, g, h, i) {}",
    { code: "function four(a, b, c, d) {}", options: [{ minimum: 5 }] },
  ],
});
