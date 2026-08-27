import { createRuleTester } from "#test/rule-tester.js";
import { ifStatementAssignmentRule } from "#rules/cleancode/if-statement-assignment.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("if-statement-assignment", ifStatementAssignmentRule, {
  invalid: [
    {
      code: "let foo; if (foo = 'bar') {}",
      errors: [{ data: { construct: "if" }, messageId: "assignmentInCondition" }],
    },
    {
      code: "let foo, baz; if (foo && (baz = 1)) {}",
      errors: [{ data: { construct: "if" }, messageId: "assignmentInCondition" }],
    },
    {
      code: "let foo; while (foo = next()) {}",
      errors: [{ data: { construct: "while" }, messageId: "assignmentInCondition" }],
    },
    {
      code: "let foo; do {} while (foo = next());",
      errors: [{ data: { construct: "do-while" }, messageId: "assignmentInCondition" }],
    },
    {
      code: "let foo; for (let i = 0; foo = check(i); i++) {}",
      errors: [{ data: { construct: "for" }, messageId: "assignmentInCondition" }],
    },
    {
      code: "let a, b; if (a = b = 1) {}",
      errors: [
        { data: { construct: "if" }, messageId: "assignmentInCondition" },
        { data: { construct: "if" }, messageId: "assignmentInCondition" },
      ],
    },
  ],
  valid: [
    "let foo; if (foo === 'bar') {}",
    "let foo; while (foo === 'bar') {}",
    "let foo; if (foo += 1) {}",
    "for (let i = 0; i < 10; i++) {}",
  ],
});
