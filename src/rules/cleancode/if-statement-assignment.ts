import type { ESTree, Rule } from "@oxlint/plugins";
import { forEachChildNode, isNodeOfType } from "#utils/ast-walk.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";

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
    diagnostic: Readonly<{
      readonly data: Readonly<{ readonly construct: string }>;
      readonly loc: Readonly<NodeLocation>;
      readonly messageId: string;
    }>,
  ) => void;
}

/**
 * Minimal shape shared by every ESTree node: enough to drive generic recursion. Structurally
 * identical to `#utils/ast-walk.js`'s own `NodeLike`.
 */
// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- see the identical, explained `NodeLike` in `#utils/ast-walk.js`; this copy must stay structurally identical for values to flow between the two modules.
type NodeLike = Readonly<Record<string, unknown>> & { readonly type: string };

/**
 * Generic recursive descendant search for `AssignmentExpression` nodes, mirroring PDepend's
 * (phpmd's underlying parser) unconditional `findChildrenOfType('AssignmentExpression')`, which
 * walks every descendant of the condition expression with no early stop — including inside
 * nested logical/binary/conditional expressions, call arguments, and even nested closures. This
 * also means a chained assignment like `if (a = b = c)` reports both assignments, matching
 * phpmd's flat descendant search.
 * @param {Readonly<NodeLike> | null | undefined} root - The node to search, if any.
 * @returns {readonly DeepReadonly<ESTree.AssignmentExpression>[]} Every `AssignmentExpression`
 *   found, starting from (and including) `root` itself.
 */
const listAssignments = (
  root: Readonly<NodeLike> | null | undefined,
): readonly DeepReadonly<ESTree.AssignmentExpression>[] => {
  const found: DeepReadonly<ESTree.AssignmentExpression>[] = [];
  const visit = (node: Readonly<NodeLike>): void => {
    if (isNodeOfType(node, "AssignmentExpression")) {
      found.push(node);
    }
    forEachChildNode(node, visit);
  };
  if (root) {
    visit(root);
  }
  return found;
};

/**
 * Ported from phpmd's `IfStatementAssignment` rule (cleancode.xml).
 * https://phpmd.org/rules/cleancode.html#ifstatementassignment
 *
 * phpmd's original only scans `if`/`elseif` conditions — there is no equivalent phpmd rule for
 * `while`, `do-while`, or `for`, since PHP's cleancode ruleset simply never added one. The same
 * "= instead of ==" typo hazard applies just as much to those constructs in JS/TS, so this port
 * deliberately extends coverage to `while`, `do-while`, and the middle clause of `for` as well.
 */
const ifStatementAssignmentRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const check = (test: DeepReadonly<ESTree.Node> | null | undefined, construct: string): void => {
      for (const assignment of listAssignments(test)) {
        if (assignment.operator === "=") {
          context.report({
            data: { construct },
            loc: assignment.loc,
            messageId: "assignmentInCondition",
          });
        }
      }
    };
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      DoWhileStatement(node) {
        check(node.test, "do-while");
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      ForStatement(node) {
        check(node.test, "for");
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      IfStatement(node) {
        check(node.test, "if");
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      WhileStatement(node) {
        check(node.test, "while");
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow assignment expressions used as the test condition of if/while/do-while/for statements.",
      url: "https://phpmd.org/rules/cleancode.html#ifstatementassignment",
    },
    messages: {
      assignmentInCondition:
        "Avoid assigning a value inside a '{{construct}}' condition; this is often a typo for a comparison operator.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { ifStatementAssignmentRule };
