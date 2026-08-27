import { createRuleTester } from "#test/rule-tester.js";
import { tooManyPublicMethodsRule } from "#rules/codesize/too-many-public-methods.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("too-many-public-methods", tooManyPublicMethodsRule, {
  invalid: [
    {
      // `invoke` and `doWork` are both public and don't match the default ignorepattern: count = 2 > 1.
      code: "class Foo { invoke() {} doWork() {} private helper() {} }",
      errors: [
        { data: { count: 2, maxmethods: 1, name: "Foo" }, messageId: "tooManyPublicMethods" },
      ],
      options: [{ maxmethods: 1 }],
    },
  ],
  valid: [
    // `getClass` is excluded by the default ignorepattern, `helper` is private: only `invoke` counts (1 <= 1).
    {
      code: "class Foo { invoke() {} private helper() {} getClass() {} }",
      options: [{ maxmethods: 1 }],
    },
  ],
});
