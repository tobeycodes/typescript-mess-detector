import { createRuleTester } from "#test/rule-tester.js";
import { duplicatedArrayKeyRule } from "#rules/cleancode/duplicated-array-key.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("duplicated-array-key", duplicatedArrayKeyRule, {
  invalid: [
    {
      code: "const obj = {\n  foo: 'bar',\n  foo: 'baz',\n};",
      errors: [{ data: { key: "foo", line: 2 }, messageId: "duplicatedKey" }],
    },
    {
      code: "const obj = {\n  foo: 'bar',\n  'foo': 'baz',\n};",
      errors: [{ data: { key: "foo", line: 2 }, messageId: "duplicatedKey" }],
    },
    {
      code: "const obj = {\n  0: 'a',\n  '0': 'b',\n};",
      errors: [{ data: { key: "0", line: 2 }, messageId: "duplicatedKey" }],
    },
    {
      code: "const obj = {\n  get foo() { return 1; },\n  foo: 2,\n};",
      errors: [{ data: { key: "foo", line: 2 }, messageId: "duplicatedKey" }],
    },
    {
      code: "const obj = {\n  get foo() { return 1; },\n  set foo(v) {},\n  get foo() { return 2; },\n};",
      errors: [{ data: { key: "foo", line: 2 }, messageId: "duplicatedKey" }],
    },
  ],
  valid: [
    "const obj = { foo: 'bar', baz: 'qux' };",
    "const obj = { [computed]: 1, [computed2]: 2 };",
    "const obj = { get foo() { return 1; }, set foo(value) {} };",
    "const obj = { 0: 'a', 1: 'b' };",
    "const obj = { ...spread, foo: 1 };",
  ],
});
