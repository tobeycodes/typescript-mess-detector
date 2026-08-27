import type { DeepReadonly } from "./deep-readonly.js";
import type { ESTree } from "@oxlint/plugins";
import { bareName } from "./names.js";
import { isString } from "./type-guards.js";

interface NodeWithParent {
  readonly parent?: ESTree.Node | null;
}

interface FunctionInfo {
  /** Mirrors phpmd's `$node->getType()` for FunctionAware/MethodAware rules. */
  readonly kind: "function" | "method";
  /** Mirrors phpmd's `$node->getName()`; falls back to `"anonymous"` when JS allows an unnamed function that PHP would not. */
  readonly name: string;
}

/**
 * Produces `undefined` without spelling the token.
 *
 * @param {Value} value - never pass this; its "not passed" state is the point.
 * @returns {Value | undefined} `undefined`.
 */
const absent = <Value>(value?: Value): Value | undefined => value;

/**
 * Best-effort name for a `MethodDefinition`/`PropertyDefinition`/`Property` key, mirroring
 * how phpmd names fields and methods.
 *
 * @param {DeepReadonly<ESTree.PropertyKey>} key - the member's key node.
 * @param {boolean} computed - whether the key is a computed (`[expr]`) key.
 * @returns {string | undefined} the resolved name, or `undefined` for a computed or otherwise
 *   unresolvable key.
 */
const candidateBareKeyName = (
  key: DeepReadonly<ESTree.PropertyKey>,
  computed: boolean,
): string | undefined => {
  if (computed) {
    return absent();
  }
  if (key.type === "Identifier") {
    return key.name;
  }
  if (key.type === "PrivateIdentifier") {
    return bareName(key.name);
  }
  return absent();
};

/**
 * Names a function/method-like node from its own `id`, for named function declarations and
 * expressions.
 *
 * @param {DeepReadonly<ESTree.Function>} node - the function/method-like node.
 * @returns {FunctionInfo | undefined} the resolved info, or `undefined` if `node` has no `id`.
 */
const candidateFromDeclaredFunction = (
  node: DeepReadonly<ESTree.Function>,
): FunctionInfo | undefined => {
  if (node.type === "FunctionDeclaration" && node.id) {
    return { kind: "function", name: node.id.name };
  }
  if (node.type === "FunctionExpression" && node.id) {
    return { kind: "function", name: node.id.name };
  }
  return absent();
};

/**
 * Names a function/method-like node from its enclosing `MethodDefinition`, if it has one.
 *
 * @param {DeepReadonly<ESTree.Node> | null | undefined} parent - the candidate node's parent.
 * @returns {FunctionInfo | undefined} the resolved info, or `undefined` if `parent` isn't a
 *   `MethodDefinition`.
 */
const candidateFromMethodDefinition = (
  parent: DeepReadonly<ESTree.Node> | null | undefined,
): FunctionInfo | undefined => {
  if (!parent) {
    return absent();
  }
  if (parent.type !== "MethodDefinition") {
    return absent();
  }
  if (parent.kind === "constructor") {
    return { kind: "method", name: "constructor" };
  }
  return { kind: "method", name: candidateBareKeyName(parent.key, parent.computed) ?? "method" };
};

/**
 * Names a function/method-like node from its enclosing class/object property, if it has one.
 *
 * @param {DeepReadonly<ESTree.Node> | null | undefined} parent - the candidate node's parent.
 * @returns {FunctionInfo | undefined} the resolved info, or `undefined` if `parent` isn't a
 *   non-computed `PropertyDefinition`/`Property`.
 */
const candidateFromPropertyLike = (
  parent: DeepReadonly<ESTree.Node> | null | undefined,
): FunctionInfo | undefined => {
  if (!parent) {
    return absent();
  }
  if (parent.type !== "PropertyDefinition" && parent.type !== "Property") {
    return absent();
  }
  if (parent.computed) {
    return absent();
  }
  const name = candidateBareKeyName(parent.key, false);
  if (isString(name)) {
    return { kind: "function", name };
  }
  return absent();
};

/**
 * Names a function/method-like node from its enclosing `const name = ...` variable declarator,
 * if it has one.
 *
 * @param {DeepReadonly<ESTree.Node> | null | undefined} parent - the candidate node's parent.
 * @returns {FunctionInfo | undefined} the resolved info, or `undefined` if `parent` isn't such
 *   a declarator.
 */
const candidateFromVariableDeclarator = (
  parent: DeepReadonly<ESTree.Node> | null | undefined,
): FunctionInfo | undefined => {
  if (!parent) {
    return absent();
  }
  if (parent.type !== "VariableDeclarator") {
    return absent();
  }
  if (parent.id.type !== "Identifier") {
    return absent();
  }
  return { kind: "function", name: parent.id.name };
};

/**
 * Type-predicate guard checking whether `node` structurally carries a `parent` property at
 * all — the real `ESTree.Function` type doesn't declare one, but the plugin runtime attaches
 * one before dispatching to rules.
 *
 * @param {DeepReadonly<ESTree.Function>} node - the candidate node.
 * @returns {node is DeepReadonly<ESTree.Function> & NodeWithParent} whether `node` has a
 *   `parent` property.
 */
const candidateHasParentField = (
  node: DeepReadonly<ESTree.Function>,
): node is DeepReadonly<ESTree.Function> & NodeWithParent => "parent" in node;

/**
 * Reads the runtime-attached `parent` link off a function/method-like node.
 *
 * @param {DeepReadonly<ESTree.Function>} node - the function/method-like node.
 * @returns {ESTree.Node | null | undefined} its parent, if the node carries one.
 */
const candidateParent = (node: DeepReadonly<ESTree.Function>): ESTree.Node | null | undefined => {
  if (candidateHasParentField(node)) {
    return node.parent;
  }
  return absent();
};

/**
 * Describes a function-like node the way phpmd's `FunctionAware`/`MethodAware`
 * rules would: class methods (including getters/setters) are `"method"`,
 * everything else is `"function"`. PHP always names its functions and methods;
 * JS/TS additionally allows anonymous function expressions and arrow
 * functions, which are named here from their nearest binding (a
 * `const name = ...` or object/class property) when possible, falling back to
 * `"anonymous"` otherwise.
 *
 * @param {DeepReadonly<ESTree.Function>} node - the function/method-like node to describe.
 * @returns {FunctionInfo} the resolved description.
 */
const describeFunctionLike = (node: DeepReadonly<ESTree.Function>): FunctionInfo => {
  const parent = candidateParent(node);
  const resolved = [
    candidateFromDeclaredFunction(node),
    candidateFromMethodDefinition(parent),
    candidateFromPropertyLike(parent),
    candidateFromVariableDeclarator(parent),
  ].find((candidate): candidate is FunctionInfo => typeof candidate === "object");
  if (resolved) {
    return resolved;
  }
  return { kind: "function", name: "anonymous" };
};

export type { FunctionInfo };

export { describeFunctionLike };
