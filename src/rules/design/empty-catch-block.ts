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
 * Ported from phpmd's `EmptyCatchBlock` rule (design.xml).
 * https://phpmd.org/rules/design.html#emptycatchblock
 *
 * phpmd flags a catch block whose scope has zero children. Comments aren't part of
 * the statement list in either PDepend's AST or ESTree, so a catch block containing
 * only a comment is empty by this same measure — matching phpmd's behavior.
 */
export const emptyCatchBlockRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const EMPTY_BLOCK_STATEMENT_COUNT = 0;
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      CatchClause(node) {
        if (node.body.body.length === EMPTY_BLOCK_STATEMENT_COUNT) {
          context.report({ loc: node.loc, messageId: "emptyCatchBlock" });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow empty catch blocks.",
      url: "https://phpmd.org/rules/design.html#emptycatchblock",
    },
    messages: {
      emptyCatchBlock: "Avoid using empty catch blocks; they silently swallow errors.",
    },
    schema: [],
    type: "suggestion",
  },
};
