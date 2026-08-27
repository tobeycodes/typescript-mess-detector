import { createRuleTester } from "#test/rule-tester.js";
import { cyclomaticComplexityRule } from "#rules/codesize/cyclomatic-complexity.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("cyclomatic-complexity", cyclomaticComplexityRule, {
  invalid: [
    {
      // 9 sequential `if`s: complexity = 1 + 9 = 10, at the default threshold of 10.
      code: `function nineIfs(a) {
        if (a === 1) return 1;
        if (a === 2) return 2;
        if (a === 3) return 3;
        if (a === 4) return 4;
        if (a === 5) return 5;
        if (a === 6) return 6;
        if (a === 7) return 7;
        if (a === 8) return 8;
        if (a === 9) return 9;
        return 0;
      }`,
      errors: [
        {
          data: { complexity: 10, kind: "function", name: "nineIfs", reportLevel: 10 },
          messageId: "tooComplex",
        },
      ],
    },
    {
      // Base(1) + if(1) + &&(1) + if(1) + ||(1) = 5
      code: "class Foo { bar(a, b, c, d) { if (a && b) {} if (c || d) {} } }",
      errors: [
        {
          data: { complexity: 5, kind: "method", name: "bar", reportLevel: 5 },
          messageId: "tooComplex",
        },
      ],
      options: [{ reportLevel: 5 }],
    },
    {
      code: "const handler = (a) => { if (a) return 1; if (!a) return 2; };",
      errors: [
        {
          data: { complexity: 3, kind: "function", name: "handler", reportLevel: 3 },
          messageId: "tooComplex",
        },
      ],
      options: [{ reportLevel: 3 }],
    },
  ],
  valid: [
    // 8 sequential `if`s: complexity = 1 + 8 = 9, below the default threshold of 10.
    `function eightIfs(a) {
      if (a === 1) return 1;
      if (a === 2) return 2;
      if (a === 3) return 3;
      if (a === 4) return 4;
      if (a === 5) return 5;
      if (a === 6) return 6;
      if (a === 7) return 7;
      if (a === 8) return 8;
      return 0;
    }`,
    { code: "function f(a, b) { if (a && b) {} }", options: [{ reportLevel: 4 }] },
    "declare function overload(a: number): void;",
  ],
});
