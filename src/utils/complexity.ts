import { forEachChildNode, isFunctionBoundary, isNodeOfType } from "./ast-walk.js";
import type { DeepReadonly } from "./deep-readonly.js";
import type { ESTree } from "@oxlint/plugins";

/** Structurally identical to `./ast-walk.js`'s own `NodeLike`. */
// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- see the identical, explained `NodeLike` in `./ast-walk.ts`; this copy must stay structurally identical for values to flow between the two modules.
type NodeLike = Record<string, unknown> & { type: string };

const INITIAL_COMPLEXITY = 1;

const NO_POINT = 0;

const ONE_POINT = 1;

/**
 * The complexity contribution of a single node in isolation (not counting its children,
 * which the caller visits separately): one point for each decision-point node type pdepend's
 * `ccn2` counts, zero for everything else.
 *
 * @param {Readonly<NodeLike>} node - the node to score.
 * @returns {number} `0` or `1`.
 */
const complexityDelta = (node: Readonly<NodeLike>): number => {
  switch (node.type) {
    case "IfStatement":
    case "ConditionalExpression":
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
    case "WhileStatement":
    case "DoWhileStatement":
    case "CatchClause": {
      return ONE_POINT;
    }
    case "SwitchCase": {
      if (isNodeOfType(node, "SwitchCase") && node.test) {
        return ONE_POINT;
      }
      return NO_POINT;
    }
    case "LogicalExpression": {
      if (
        isNodeOfType(node, "LogicalExpression") &&
        (node.operator === "&&" || node.operator === "||")
      ) {
        return ONE_POINT;
      }
      return NO_POINT;
    }
    default: {
      return NO_POINT;
    }
  }
};

/**
 * Mirrors pdepend's `ccn2` metric, which is what phpmd's `CyclomaticComplexity`
 * and `WeightedMethodCount` (ExcessiveClassComplexity) rules read via
 * `$node->getMetric('ccn2')` / `getMetric('wmc')`. Complexity starts at 1 for
 * the function/method itself and gains one point per decision point: `if`
 * (each `else if` is its own nested `IfStatement`, so it is counted too),
 * ternary (`?:`), `for`, `for-in`/`for-of`, `while`, `do-while`, `catch`, each
 * non-default `case` label, and each `&&`/`||` operator (the "2" in `ccn2`
 * denotes this extended count that includes boolean operators, unlike the
 * plain `ccn` metric).
 *
 * Traversal stops at nested function boundaries: a nested function
 * expression/arrow function/method has its own complexity measured
 * separately when the rule visits that node on its own, so it must not be
 * folded into the enclosing function's count.
 *
 * Note: JS/TS's nullish-coalescing (`??`) operator has no PHP equivalent and
 * is intentionally not counted, to stay faithful to what pdepend's `ccn2`
 * counts for PHP's `&&`/`||`.
 *
 * @param {DeepReadonly<ESTree.Function>} root - the function/method node to measure.
 * @returns {number} the cyclomatic (`ccn2`) complexity.
 */
const cyclomaticComplexity = (root: DeepReadonly<ESTree.Function>): number => {
  let complexity = INITIAL_COMPLEXITY;
  const visit = (node: Readonly<NodeLike>, isRoot: boolean): void => {
    if (!isRoot && isFunctionBoundary(node)) {
      return;
    }
    complexity += complexityDelta(node);
    forEachChildNode(node, (child) => {
      visit(child, false);
    });
  };
  visit(root, true);
  return complexity;
};

export { cyclomaticComplexity };
