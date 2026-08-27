import type { DeepReadonly } from "./deep-readonly.js";
import type { ESTree } from "@oxlint/plugins";
import { FUNCTION_LIKE_TYPES } from "./ast.js";

// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- every ESTree node's non-`type` field varies per node kind with no visitor-key table to consult; `isNodeOfType` also relies on concrete ESTree interfaces staying structurally assignable back into this type, which only an `unknown` value type permits (a concrete union breaks `tsc` across call sites).
type NodeLike = Record<string, unknown> & { type: string };

const FUNCTION_LIKE_TYPE_SET = new Set<string>(FUNCTION_LIKE_TYPES);

const SKIP_KEYS = new Set(["parent"]);

/**
 * True when `value` is shaped enough like an ESTree node to recurse into: an object with a
 * string `type` tag.
 *
 * @template TCandidate - the static type of the candidate value, preserved on narrowing.
 * @param {TCandidate} value - the candidate value.
 * @returns {value is TCandidate & NodeLike} whether `value` looks like an ESTree node.
 */
const checkNodeLike = <TCandidate>(value: TCandidate): value is TCandidate & NodeLike => {
  if (typeof value !== "object") {
    return false;
  }
  if (!value) {
    return false;
  }
  if (!("type" in value)) {
    return false;
  }
  return typeof value.type === "string";
};

/**
 * Visits the immediate ESTree child nodes of `node` — properties whose value is
 * a node, or an array containing nodes.
 *
 * @param {Readonly<NodeLike>} node - the node whose children should be visited.
 * @param {(child: Readonly<NodeLike>) => void} visit - called once per immediate child node.
 * @returns {void}
 */
const forEachChildNode = (
  node: Readonly<NodeLike>,
  visit: (child: Readonly<NodeLike>) => void,
): void => {
  const visitIfNode = <TCandidate>(value: TCandidate): value is TCandidate & NodeLike => {
    const isNode = checkNodeLike(value);
    if (isNode) {
      visit(value);
    }
    return isNode;
  };
  for (const key of Object.keys(node)) {
    if (!SKIP_KEYS.has(key)) {
      const value = node[key];
      if (Array.isArray(value)) {
        // SAFETY: `Array.isArray` narrows through its legacy `any[]` predicate; re-asserting `readonly unknown[]` restores the unknown-until-checked contract instead of leaking `any` into `visitIfNode`.
        for (const item of value as readonly unknown[]) {
          visitIfNode(item);
        }
      } else {
        visitIfNode(value);
      }
    }
  }
};

/**
 * True for nodes that introduce their own function scope (own complexity/NPath unit).
 *
 * @param {Readonly<NodeLike>} node - the node to check.
 * @returns {boolean} whether `node` is a function/method-like boundary.
 */
const isFunctionBoundary = (node: Readonly<NodeLike>): boolean =>
  FUNCTION_LIKE_TYPE_SET.has(node.type);

/**
 * Builds a type-predicate guard for a single ESTree `Node` union member, narrowing a
 * duck-typed {@link NodeLike} to the real, fully-typed ESTree interface for that `type`
 * tag.
 *
 * @param {Readonly<NodeLike>} node - the node to test.
 * @param {Type} tag - the ESTree `type` string identifying the desired node shape.
 * @returns {node is Readonly<NodeLike> & DeepReadonly<Extract<ESTree.Node, { type: Type }>>}
 *   whether `node.type === tag`, narrowing `node` to that specific ESTree interface.
 */
const isNodeOfType = <Type extends ESTree.Node["type"]>(
  node: Readonly<NodeLike>,
  tag: Type,
): node is Readonly<NodeLike> & DeepReadonly<Extract<ESTree.Node, { type: Type }>> =>
  node.type === tag;

export type { NodeLike };

export { forEachChildNode, isFunctionBoundary, isNodeOfType };
