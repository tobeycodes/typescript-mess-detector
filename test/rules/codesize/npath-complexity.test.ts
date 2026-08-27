import { createRuleTester } from "#test/rule-tester.js";
import { npathComplexityRule } from "#rules/codesize/npath-complexity.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("npath-complexity", npathComplexityRule, {
  invalid: [
    {
      // 5 sequential plain `if`s: 3^5 = 243, at or above the default threshold of 200.
      code: `function fiveIfs(a, b, c, d, e) {
        if (a) { x(); }
        if (b) { x(); }
        if (c) { x(); }
        if (d) { x(); }
        if (e) { x(); }
      }`,
      errors: [
        {
          data: { kind: "function", minimum: 200, name: "fiveIfs", npath: 243 },
          messageId: "tooComplex",
        },
      ],
    },
    {
      // NP(if) = NP(a && b) + NP(then) + NP(no else) = (1 + 1) + 1 + 1 = 4.
      code: "function f(a, b) { if (a && b) { x(); } }",
      errors: [
        { data: { kind: "function", minimum: 4, name: "f", npath: 4 }, messageId: "tooComplex" },
      ],
      options: [{ minimum: 4 }],
    },
    {
      // NP(while) = NP(a) + NP(body) + 1 = 1 + 1 + 1 = 3.
      code: "class Foo { bar(a) { while (a) { x(); } } }",
      errors: [
        { data: { kind: "method", minimum: 3, name: "bar", npath: 3 }, messageId: "tooComplex" },
      ],
      options: [{ minimum: 3 }],
    },
  ],
  valid: [
    // 4 sequential plain `if`s with no `else`: NP(if) = 1(test) + 1(then) + 1(no else) = 3 each.
    // Sequence multiplies: 3^4 = 81, below the default threshold of 200.
    `function fourIfs(a, b, c, d) {
      if (a) { x(); }
      if (b) { x(); }
      if (c) { x(); }
      if (d) { x(); }
    }`,
    { code: "function f(a) { while (a) { x(); } }", options: [{ minimum: 4 }] },
    "declare function overload(a: number): void;",
  ],
});
