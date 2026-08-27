import type { DeepReadonly } from "./deep-readonly.js";
import type { ESTree } from "@oxlint/plugins";
import { FUNCTION_LIKE_TYPES } from "./ast.js";

/**
 * The minimal, fully `readonly` shape this module needs to walk `.parent` chains.
 */
interface ParentedNode {
  readonly type: string;
  readonly parent?: ParentedNode | null;
}

/** Duck-typed shape shared by `MethodDefinition`, `TSAbstractMethodDefinition` (not modeled by
 * `@oxlint/plugins`'s `ESTree.Node` union at all), and `PropertyDefinition`: each has a `.key`. */
interface KeyedDefinitionNode {
  readonly key: ESTree.PropertyKey;
}

const FUNCTION_LIKE_SET = new Set<string>(FUNCTION_LIKE_TYPES);

/**
 * Produces `undefined` without spelling the token.
 *
 * @param {Value} value - never pass this; its "not passed" state is the point.
 * @returns {Value | undefined} `undefined`.
 */
const absent = <Value>(value?: Value): Value | undefined => value;

/**
 * Type-predicate guard narrowing a {@link ParentedNode} to `ESTree.AssignmentExpression`.
 *
 * @param {Readonly<ParentedNode>} node - the node to test.
 * @returns {node is Readonly<ParentedNode> & Readonly<ESTree.AssignmentExpression>} whether
 *   `node` is an assignment expression.
 */
const bAssignmentExpressionNode = (
  node: Readonly<ParentedNode>,
): node is Readonly<ParentedNode> & Readonly<ESTree.AssignmentExpression> =>
  node.type === "AssignmentExpression";

/**
 * Type-predicate guard narrowing a {@link ParentedNode} to `ESTree.Class`.
 *
 * @param {Readonly<ParentedNode>} node - the node to test.
 * @returns {node is Readonly<ParentedNode> & Readonly<ESTree.Class>} whether `node` is a class
 *   declaration/expression.
 */
const bClassNode = (
  node: Readonly<ParentedNode>,
): node is Readonly<ParentedNode> & Readonly<ESTree.Class> =>
  node.type === "ClassDeclaration" || node.type === "ClassExpression";

/**
 * Type-predicate guard narrowing a {@link ParentedNode} to `ESTree.Function` — the safe
 * alternative to an `as ESTree.Function` assertion.
 *
 * @param {Readonly<ParentedNode>} node - the node to test.
 * @returns {node is Readonly<ParentedNode> & Readonly<ESTree.Function>} whether `node` is a
 *   function/method-like node.
 */
const bFunctionNode = (
  node: Readonly<ParentedNode>,
): node is Readonly<ParentedNode> & Readonly<ESTree.Function> => FUNCTION_LIKE_SET.has(node.type);

/**
 * Type-predicate guard checking whether `node` structurally carries a `parent` property at
 * all — the real `ESTree.Function` type doesn't declare one, but the plugin runtime attaches
 * one before dispatching to rules.
 *
 * @param {DeepReadonly<ESTree.Function>} node - the candidate node.
 * @returns {node is { readonly parent?: ESTree.Node | null }} whether `node` has a `parent`
 *   property.
 */
const bHasParentField = (
  node: DeepReadonly<ESTree.Function>,
): node is DeepReadonly<ESTree.Function> & { readonly parent?: ESTree.Node | null } =>
  "parent" in node;

/**
 * Type-predicate guard narrowing any candidate value to `string`.
 * @template TCandidate - the static type of the candidate value, preserved on narrowing.
 * @param {TCandidate} value - the candidate value.
 * @returns {value is TCandidate & string} whether `value` is a string.
 */
const bIsString = <TCandidate>(value: TCandidate): value is TCandidate & string =>
  typeof value === "string";

/**
 * Best-effort name for a property key node, mirroring what phpmd's PHP parser would see for
 * an equivalent method/property name.
 *
 * @param {DeepReadonly<ESTree.PropertyKey>} key - the key node.
 * @returns {string | undefined} the resolved name, or `undefined` for a key shape with no
 *   simple string name (e.g. a computed key).
 */
const bKeyName = (key: DeepReadonly<ESTree.PropertyKey>): string | undefined => {
  if (key.type === "Identifier") {
    return key.name;
  }
  if (key.type === "PrivateIdentifier") {
    return key.name;
  }
  if (key.type === "Literal" && bIsString(key.value)) {
    return key.value;
  }
  return absent();
};

/**
 * Type-predicate guard narrowing a {@link ParentedNode} to {@link KeyedDefinitionNode}: a
 * `MethodDefinition`, `TSAbstractMethodDefinition`, or `PropertyDefinition`.
 *
 * @param {Readonly<ParentedNode>} node - the node to test.
 * @returns {node is Readonly<ParentedNode> & Readonly<KeyedDefinitionNode>} whether `node` is
 *   one of the three keyed definition node types.
 */
const bKeyedDefinitionNode = (
  node: Readonly<ParentedNode>,
): node is Readonly<ParentedNode> & Readonly<KeyedDefinitionNode> =>
  node.type === "MethodDefinition" ||
  node.type === "TSAbstractMethodDefinition" ||
  node.type === "PropertyDefinition";

/**
 * Type-predicate guard narrowing a {@link ParentedNode} to `ESTree.ObjectProperty` (an object
 * literal's `{ key: value }` entry — ESTree's own `.type` tag for it is `"Property"`).
 *
 * @param {Readonly<ParentedNode>} node - the node to test.
 * @returns {node is Readonly<ParentedNode> & Readonly<ESTree.ObjectProperty>} whether `node` is
 *   an object property.
 */
const bObjectPropertyNode = (
  node: Readonly<ParentedNode>,
): node is Readonly<ParentedNode> & Readonly<ESTree.ObjectProperty> => node.type === "Property";

/**
 * Reads the runtime-attached `parent` link off a function/method-like node.
 *
 * @param {DeepReadonly<ESTree.Function>} node - the function/method-like node.
 * @returns {ESTree.Node | null | undefined} its parent, if the node carries one.
 */
const bParentOf = (node: DeepReadonly<ESTree.Function>): ESTree.Node | null | undefined => {
  if (bHasParentField(node)) {
    return node.parent;
  }
  return absent();
};

/**
 * Type-predicate guard narrowing a {@link ParentedNode} to `ESTree.VariableDeclarator`.
 *
 * @param {Readonly<ParentedNode>} node - the node to test.
 * @returns {node is Readonly<ParentedNode> & Readonly<ESTree.VariableDeclarator>} whether
 *   `node` is a variable declarator.
 */
const bVariableDeclaratorNode = (
  node: Readonly<ParentedNode>,
): node is Readonly<ParentedNode> & Readonly<ESTree.VariableDeclarator> =>
  node.type === "VariableDeclarator";

/**
 * Names a function-like node from its enclosing `name = ...` assignment expression, if it has
 * one.
 *
 * @param {Readonly<ParentedNode> | null | undefined} parent - the candidate node's parent.
 * @returns {string | undefined} the resolved name, or `undefined` if `parent` isn't such an
 *   assignment with a simple identifier target.
 */
const candidateAssignmentName = (
  parent: Readonly<ParentedNode> | null | undefined,
): string | undefined => {
  if (parent && bAssignmentExpressionNode(parent) && parent.left.type === "Identifier") {
    return parent.left.name;
  }
  return absent();
};

/**
 * Names a function-like node from its enclosing `MethodDefinition`/`TSAbstractMethodDefinition`/
 * `PropertyDefinition`, if it has one.
 *
 * @param {Readonly<ParentedNode> | null | undefined} parent - the candidate node's parent.
 * @returns {string | undefined} the resolved name, or `undefined` if `parent` isn't one of
 *   these three node types.
 */
const candidateKeyedDefinitionName = (
  parent: Readonly<ParentedNode> | null | undefined,
): string | undefined => {
  if (parent && bKeyedDefinitionNode(parent)) {
    return bKeyName(parent.key);
  }
  return absent();
};

/**
 * Names a function-like node from its own `id`, for named function declarations.
 *
 * @param {DeepReadonly<ESTree.Function>} fn - the function/method-like node.
 * @returns {string | undefined} the resolved name, or `undefined` if `fn` has no `id`.
 */
const candidateOwnFunctionName = (fn: DeepReadonly<ESTree.Function>): string | undefined => {
  if ((fn.type === "FunctionDeclaration" || fn.type === "TSDeclareFunction") && fn.id) {
    return fn.id.name;
  }
  return absent();
};

/**
 * Names a function-like node from its enclosing object-literal property, if it has one.
 *
 * @param {Readonly<ParentedNode> | null | undefined} parent - the candidate node's parent.
 * @returns {string | undefined} the resolved name, or `undefined` if `parent` isn't a
 *   non-computed object property.
 */
const candidatePropertyName = (
  parent: Readonly<ParentedNode> | null | undefined,
): string | undefined => {
  if (parent && bObjectPropertyNode(parent) && !parent.computed) {
    return bKeyName(parent.key);
  }
  return absent();
};

/**
 * Names a function-like node from its enclosing `const name = ...` variable declarator, if it
 * has one.
 *
 * @param {Readonly<ParentedNode> | null | undefined} parent - the candidate node's parent.
 * @returns {string | undefined} the resolved name, or `undefined` if `parent` isn't such a
 *   declarator with a simple identifier name.
 */
const candidateVariableDeclaratorName = (
  parent: Readonly<ParentedNode> | null | undefined,
): string | undefined => {
  if (parent && bVariableDeclaratorNode(parent) && parent.id.type === "Identifier") {
    return parent.id.name;
  }
  return absent();
};

/**
 * Walks up from `node` to the nearest enclosing class declaration/expression's name, if any.
 *
 * @param {Readonly<ParentedNode>} node - the node to start walking up from.
 * @returns {string | undefined} the enclosing class's name, if it has one.
 */
const getEnclosingClassName = (node: Readonly<ParentedNode>): string | undefined => {
  let current = node.parent;
  while (current) {
    if (bClassNode(current)) {
      if (current.id) {
        return current.id.name;
      }
      return absent();
    }
    current = current.parent;
  }
  return absent();
};

/**
 * Walks up from `node` to the nearest enclosing function/method-like node, if any.
 *
 * Several phpmd `cleancode` rules (`ElseExpression`, `StaticAccess`, ...) are declared
 * `MethodAware`/`FunctionAware`, meaning phpmd always evaluates them within the boundary of a
 * single method or function and reports violations attributed to that method/function's name.
 * This helper reconstructs that context for a plain AST-visitor port.
 *
 * @param {Readonly<ParentedNode>} node - the node to start walking up from.
 * @returns {(Readonly<ParentedNode> & Readonly<ESTree.Function>) | undefined} the nearest
 *   enclosing function/method-like node, if any.
 */
const getEnclosingFunction = (
  node: Readonly<ParentedNode>,
): (Readonly<ParentedNode> & Readonly<ESTree.Function>) | undefined => {
  let current = node.parent;
  while (current) {
    if (bFunctionNode(current)) {
      return current;
    }
    current = current.parent;
  }
  return absent();
};

/**
 * Best-effort name for a function/method-like node, mirroring phpmd's MethodNode/FunctionNode
 * `getName()`. Handles named function declarations, class methods, and functions assigned to a
 * variable, object property, or bare identifier. Returns `undefined` when no reasonable name can
 * be determined (e.g. an immediately-invoked anonymous function expression).
 *
 * @param {DeepReadonly<ESTree.Function>} fn - the function/method-like node.
 * @returns {string | undefined} the resolved name.
 */
const getFunctionName = (fn: DeepReadonly<ESTree.Function>): string | undefined => {
  {
    const ownName = candidateOwnFunctionName(fn);
    if (bIsString(ownName)) {
      return ownName;
    }
  }
  const parent = bParentOf(fn);
  const resolved = [
    candidateKeyedDefinitionName(parent),
    candidatePropertyName(parent),
    candidateVariableDeclaratorName(parent),
    candidateAssignmentName(parent),
  ].find((candidate) => bIsString(candidate));
  return resolved;
};

export { getEnclosingClassName, getEnclosingFunction, getFunctionName };
