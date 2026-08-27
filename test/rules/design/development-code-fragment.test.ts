import { createRuleTester } from "#test/rule-tester.js";
import { developmentCodeFragmentRule } from "#rules/design/development-code-fragment.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("development-code-fragment", developmentCodeFragmentRule, {
  invalid: [
    {
      code: "function bar() { console.log('hi'); }",
      errors: [{ data: { fragment: "console.log" }, messageId: "unwantedCall" }],
    },
    {
      code: "function bar() { console.debug('hi'); }",
      errors: [{ data: { fragment: "console.debug" }, messageId: "unwantedCall" }],
    },
    {
      code: "function bar() { debugger; }",
      errors: [{ messageId: "debuggerStatement" }],
    },
    {
      code: "function bar() { myDebug('hi'); }",
      errors: [{ data: { fragment: "myDebug" }, messageId: "unwantedCall" }],
      options: [{ "unwanted-functions": "myDebug" }],
    },
  ],
  valid: [
    "function bar() { logger.info('hello'); }",
    {
      code: "function bar() { console.log('hi'); }",
      options: [{ "unwanted-functions": "console.warn" }],
    },
  ],
});
