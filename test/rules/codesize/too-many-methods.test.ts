import { createRuleTester } from "#test/rule-tester.js";
import { tooManyMethodsRule } from "#rules/codesize/too-many-methods.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("too-many-methods", tooManyMethodsRule, {
  invalid: [
    {
      // Neither `invoke` nor `doWork` match the default ignorepattern: count = 2 > 1.
      code: "class Foo { invoke() {} doWork() {} }",
      errors: [{ data: { count: 2, maxmethods: 1, name: "Foo" }, messageId: "tooManyMethods" }],
      options: [{ maxmethods: 1 }],
    },
    {
      code: "class Foo { get value() { return 1; } set value(v) {} other() {} }",
      errors: [{ data: { count: 1, maxmethods: 0, name: "Foo" }, messageId: "tooManyMethods" }],
      options: [{ maxmethods: 0 }],
    },
    {
      code: "class Foo { pub() {} }",
      errors: [{ data: { count: 1, maxmethods: 0, name: "Foo" }, messageId: "tooManyMethods" }],
      options: [{ ignorepattern: "(^_)i", maxmethods: 0 }],
    },
  ],
  valid: [
    // `getClass` is excluded by the default ignorepattern; only `invoke` counts (1 <= 1).
    { code: "class Foo { invoke() {} getClass() {} }", options: [{ maxmethods: 1 }] },
    // Native get/set accessors are always excluded, regardless of ignorepattern.
    {
      code: "class Foo { get value() { return 1; } set value(v) {} }",
      options: [{ maxmethods: 0 }],
    },
    { code: "class Foo { _private() {} }", options: [{ ignorepattern: "(^_)i", maxmethods: 0 }] },
  ],
});
