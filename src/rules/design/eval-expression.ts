import type { Rule } from "@oxlint/plugins";

interface LineColumn {
  readonly column: number;
  readonly line: number;
}

interface NodeLocation {
  readonly end: Readonly<LineColumn>;
  readonly start: Readonly<LineColumn>;
}

/** Minimal, fully-readonly view of the oxlint rule context this rule depends on. */
interface RuleContext {
  readonly report: (
    diagnostic: Readonly<{ readonly loc: Readonly<NodeLocation>; readonly messageId: string }>,
  ) => void;
}

/**
 * Ported from phpmd's `EvalExpression` rule (design.xml).
 * https://phpmd.org/rules/design.html#evalexpression
 *
 * JS has a direct equivalent to PHP's `eval`: the global `eval()` function. This
 * flags bare, unqualified calls to it — a call through a member expression such as
 * `foo.eval()` is a method on `foo`, not the global `eval`, and is intentionally
 * not flagged.
 */
export const evalExpressionRule: Rule = {
  create(context: Readonly<RuleContext>) {
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== "Identifier" || callee.name !== "eval") {
          return;
        }
        context.report({ loc: node.loc, messageId: "evalExpression" });
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow calling the global eval() function.",
      url: "https://phpmd.org/rules/design.html#evalexpression",
    },
    messages: {
      evalExpression: "Calling 'eval()' is untestable, a security risk, and should be avoided.",
    },
    schema: [],
    type: "problem",
  },
};
