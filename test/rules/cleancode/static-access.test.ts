import { createRuleTester } from "#test/rule-tester.js";
import { staticAccessRule } from "#rules/cleancode/static-access.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("static-access", staticAccessRule, {
  invalid: [
    {
      code: "function bar() { Baz.qux(); }",
      errors: [{ data: { className: "Baz", method: "bar" }, messageId: "staticAccess" }],
    },
    {
      code: "class Foo { bar() { Baz.qux(); } }",
      errors: [{ data: { className: "Baz", method: "bar" }, messageId: "staticAccess" }],
    },
    {
      code: "Baz.qux();",
      errors: [{ data: { className: "Baz", method: "(anonymous)" }, messageId: "staticAccess" }],
    },
  ],
  valid: [
    "class Foo { bar() { this.baz(); } }",
    "function bar(service) { service.baz(); }",
    "function bar(service) { service.Baz(); }",
    { code: "function bar() { Baz.qux(); }", options: [{ exceptions: "Baz" }] },
    { code: "function bar() { Baz.qux(); }", options: [{ exceptions: "Ba*" }] },
    { code: "function create() { Baz.qux(); }", options: [{ ignorepattern: "^create" }] },
  ],
});
