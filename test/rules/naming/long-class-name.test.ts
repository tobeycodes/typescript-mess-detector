import { createRuleTester } from "#test/rule-tester.js";
import { longClassNameRule } from "#rules/naming/long-class-name.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("long-class-name", longClassNameRule, {
  invalid: [
    {
      code: "class ATooLongClassNameThatHintsAtADesignProblem {}",
      errors: [
        {
          data: { maximum: 40, name: "ATooLongClassNameThatHintsAtADesignProblem" },
          messageId: "tooLong",
        },
      ],
    },
    {
      code: "interface ATooLongInterfaceNameThatHintsAtADesignProblem {}",
      errors: [
        {
          data: { maximum: 40, name: "ATooLongInterfaceNameThatHintsAtADesignProblem" },
          messageId: "tooLong",
        },
      ],
    },
  ],
  valid: ["class Foo {}", "interface Foo {}"],
});
