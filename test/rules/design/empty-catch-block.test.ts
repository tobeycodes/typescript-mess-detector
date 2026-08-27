import { createRuleTester } from "#test/rule-tester.js";
import { emptyCatchBlockRule } from "#rules/design/empty-catch-block.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("empty-catch-block", emptyCatchBlockRule, {
  invalid: [
    {
      code: "try { doSomething(); } catch (e) {}",
      errors: [{ messageId: "emptyCatchBlock" }],
    },
    {
      code: "try { doSomething(); } catch (e) { /* ignored deliberately */ }",
      errors: [{ messageId: "emptyCatchBlock" }],
    },
    {
      code: "try { doSomething(); } catch {}",
      errors: [{ messageId: "emptyCatchBlock" }],
    },
  ],
  valid: [
    "try { doSomething(); } catch (e) { handle(e); }",
    "try { doSomething(); } catch (e) { /* ignored deliberately */ throw e; }",
  ],
});
