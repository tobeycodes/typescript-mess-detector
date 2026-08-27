import type { ESTree } from "@oxlint/plugins";

/** A minimal, readonly view of an ESTree node's `.parent` chain. */
interface ParentedNode {
  readonly type: string;
  readonly parent?: ParentedNode | null;
}

const FUNCTION_LIKE_TYPES = [
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "TSDeclareFunction",
  "TSEmptyBodyFunctionExpression",
] as const;

/**
 * Type-predicate guard narrowing a {@link ParentedNode} to a real `ESTree.ForStatement`.
 *
 * @param {Readonly<ParentedNode>} node - the node to test.
 * @returns {node is Readonly<ParentedNode> & Readonly<ESTree.ForStatement>} whether `node` is a
 *   `for (...)` statement.
 */
const checkForStatementNode = (
  node: Readonly<ParentedNode>,
): node is Readonly<ParentedNode> & Readonly<ESTree.ForStatement> => node.type === "ForStatement";

/**
 * Type-predicate guard narrowing a {@link ParentedNode} to a real `ESTree.VariableDeclaration`.
 *
 * @param {Readonly<ParentedNode>} node - the node to test.
 * @returns {boolean} whether `node` is a variable declaration.
 */
const checkVariableDeclarationNode = (node: Readonly<ParentedNode>): boolean =>
  node.type === "VariableDeclaration";

/**
 * Walks up `node.parent` links looking for an ancestor of the given type(s).
 *
 * @param {Readonly<ParentedNode>} node - the node to start walking up from.
 * @param {readonly string[]} types - the ancestor `type` values being looked for.
 * @returns {boolean} whether such an ancestor exists.
 */
const isChildOf = (node: Readonly<ParentedNode>, types: readonly string[]): boolean => {
  let current = node.parent;
  while (current) {
    if (types.includes(current.type)) {
      return true;
    }
    current = current.parent;
  }
  return false;
};

/**
 * True for the `let i = 0` declarator inside a classic `for (let i = 0; ...)` init clause.
 *
 * @param {Readonly<ParentedNode>} declarator - the variable declarator to check.
 * @returns {boolean} whether it is the init-clause declarator of a `for` statement.
 */
const isForLoopInit = (declarator: Readonly<ParentedNode>): boolean => {
  const declaration = declarator.parent;
  if (declaration && checkVariableDeclarationNode(declaration)) {
    const forStatement = declaration.parent;
    if (forStatement && checkForStatementNode(forStatement)) {
      return forStatement.init === declaration;
    }
  }
  return false;
};

export { FUNCTION_LIKE_TYPES, isChildOf, isForLoopInit };
