import { RuleTester } from "oxlint/plugins-dev";

// Vitest's own `describe` returns a value, but `RuleTester.describe`'s type wants a void-returning function.
RuleTester.describe = (text, fn): void => {
  /* Vitest's `no-importing-vitest-globals` and `prefer-importing-vitest-globals` are both enabled
     and want opposite things (ambient global vs. explicit import) for the exact same `describe`/
     `it` reference; this file resolves that by using the ambient global everywhere else, so this
     one remaining reference can't also satisfy the rule that wants the opposite. */
  // oxlint-disable-next-line vitest/prefer-importing-vitest-globals
  describe(text, fn);
};
RuleTester.it = it;

/**
 * Builds a `RuleTester` preconfigured to parse test cases as TypeScript.
 *
 * `describe`/`it` are referenced here as ambient globals (enabled via `test.globals: true` in
 * `vitest.config.ts` and `"types": ["vitest/globals"]` in `tsconfig.json`) rather than imported
 * from `"vitest"`, per `vitest(no-importing-vitest-globals)`.
 *
 * @returns {RuleTester} a new rule tester instance.
 */
const createRuleTester = (): RuleTester =>
  new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

export { createRuleTester };
