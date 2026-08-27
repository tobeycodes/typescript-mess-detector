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
 * Ported from phpmd's `ElseExpression` rule (cleancode.xml).
 * https://phpmd.org/rules/cleancode.html#elseexpression
 *
 * phpmd walks each method/function body for `else` scopes whose parent is an `if`/`elseif`
 * clause, which in practice means: report once per genuine trailing `else` block, but never for
 * an `else if` link in the chain (that link is itself just another `if` awaiting its own,
 * possibly absent, `else`). In an ESTree AST, `else if` is represented as a nested `IfStatement`
 * in `alternate`, so the equivalent check is: report only when `alternate` exists and is not
 * itself an `IfStatement`.
 */
export const elseExpressionRule: Rule = {
  create(context: Readonly<RuleContext>) {
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      IfStatement(node) {
        if (!node.alternate || node.alternate.type === "IfStatement") {
          return;
        }
        context.report({ loc: node.alternate.loc, messageId: "elseExpression" });
      },
    };
  },
  meta: {
    docs: {
      description: "Discourage `else` branches in favor of early returns or guard clauses.",
      url: "https://phpmd.org/rules/cleancode.html#elseexpression",
    },
    messages: {
      elseExpression:
        "Avoid using an else expression. Else clauses are basically not necessary and you can simplify the code by not using them.",
    },
    schema: [],
    type: "suggestion",
  },
};
