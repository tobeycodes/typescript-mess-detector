import { forEachChildNode, isFunctionBoundary, isNodeOfType } from "./ast-walk.js";
import type { DeepReadonly } from "./deep-readonly.js";
import type { ESTree } from "@oxlint/plugins";
import { lookupOwn } from "./type-guards.js";

/** Structurally identical to `./ast-walk.js`'s own `NodeLike`. */
// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- see the identical, explained `NodeLike` in `./ast-walk.ts`; this copy must stay structurally identical for values to flow between the two modules.
type NodeLike = Record<string, unknown> & { type: string };

/** Computes the NPath contribution of a single statement, recursing into nested statements. */
type StatementNpath = (node: Readonly<NodeLike>) => number;

/**
 * Ports the NPath complexity metric phpmd's `NpathComplexity` rule reads from pdepend via
 * `getMetric('npath')` (pdepend itself isn't vendored into this checkout), implementing the
 * canonical published algorithm — Nejmeh's NPath complexity (1988), the same formula PMD and
 * Checkstyle use. See each `npathOf*` helper below for its per-construct formula. Everything
 * without its own control flow contributes exactly 1 path unless it embeds a nested
 * boolean/ternary expression (e.g. `return a && b;`), folded in by {@link npathExpression}.
 * Traversal stops at nested function boundaries — measured separately, on its own.
 */
const BASE_PATH = 1;

const ZERO_PATHS = 0;

/**
 * A block body's NPath: the product of every statement's NPath (paths compose — you must pick
 * a path through every statement in turn).
 * @param {readonly Readonly<NodeLike>[]} statements - the statements making up a block body.
 * @param {StatementNpath} statementNpath - computes a single statement's own NPath.
 * @returns {number} the product of every statement's NPath.
 */
const npathBlockBody = (
  statements: readonly Readonly<NodeLike>[],
  statementNpath: StatementNpath,
): number => {
  let product = BASE_PATH;
  for (const statement of statements) {
    product *= statementNpath(statement);
  }
  return product;
};

/**
 * A boolean expression's own NPath is its `&&`/`||` operator count plus 1 (each short-circuit
 * branch is its own acyclic path); a ternary `a ? b : c` contributes NP(a) + NP(b) + NP(c),
 * same as `if`/`else`. Everything else contributes exactly 1 path, plus whatever nested
 * boolean/ternary expressions are folded in from its children.
 * @param {Readonly<NodeLike> | null | undefined} node - the expression to measure (or the
 *   absent test/argument of a statement that doesn't require one, e.g. `for (;;)`).
 * @returns {number} the expression's own NPath contribution.
 */
const npathExpression = (node: Readonly<NodeLike> | null | undefined): number => {
  if (!node || isFunctionBoundary(node)) {
    return BASE_PATH;
  }
  if (isNodeOfType(node, "LogicalExpression")) {
    return npathExpression(node.left) + npathExpression(node.right);
  }
  if (isNodeOfType(node, "ConditionalExpression")) {
    return (
      npathExpression(node.test) +
      npathExpression(node.consequent) +
      npathExpression(node.alternate)
    );
  }
  let total = BASE_PATH;
  forEachChildNode(node, (child) => {
    total += npathExpression(child) - BASE_PATH;
  });
  return total;
};

/**
 * A `BlockStatement`'s NPath: {@link npathBlockBody} over its own statements.
 * @param {Readonly<NodeLike>} node - a `BlockStatement`.
 * @param {StatementNpath} statementNpath - computes a nested statement's own NPath.
 * @returns {number} the block's NPath.
 */
const npathOfBlock = (node: Readonly<NodeLike>, statementNpath: StatementNpath): number => {
  if (!isNodeOfType(node, "BlockStatement")) {
    return BASE_PATH;
  }
  return npathBlockBody(node.body, statementNpath);
};

/**
 * An `ExpressionStatement`'s NPath: its expression's own NPath.
 * @param {Readonly<NodeLike>} node - an `ExpressionStatement`.
 * @returns {number} the statement's NPath.
 */
const npathOfExpressionStatement = (node: Readonly<NodeLike>): number => {
  if (!isNodeOfType(node, "ExpressionStatement")) {
    return BASE_PATH;
  }
  return npathExpression(node.expression);
};

/**
 * `for (...; C; ...) B` = NP(C) + NP(B) + 1 (NP(C) defaults to 1 for `for (;;)`, since
 * {@link npathExpression} returns `BASE_PATH` for a `null`/`undefined` test).
 * @param {Readonly<NodeLike>} node - a `ForStatement`.
 * @param {StatementNpath} statementNpath - computes a nested statement's own NPath.
 * @returns {number} the loop's NPath.
 */
const npathOfFor = (node: Readonly<NodeLike>, statementNpath: StatementNpath): number => {
  if (!isNodeOfType(node, "ForStatement")) {
    return BASE_PATH;
  }
  return npathExpression(node.test) + statementNpath(node.body) + BASE_PATH;
};

/**
 * `for..in` / `for..of` B = NP(B) + 1 (no boolean test to fold in).
 * @param {Readonly<NodeLike>} node - a `ForInStatement` or `ForOfStatement`.
 * @param {StatementNpath} statementNpath - computes a nested statement's own NPath.
 * @returns {number} the loop's NPath.
 */
const npathOfForInOf = (node: Readonly<NodeLike>, statementNpath: StatementNpath): number => {
  if (isNodeOfType(node, "ForInStatement") || isNodeOfType(node, "ForOfStatement")) {
    return statementNpath(node.body) + BASE_PATH;
  }
  return BASE_PATH;
};

/**
 * `if (C) A [else B]` = NP(C) + NP(A) + NP(B), where NP(B) is 1 with no `else`.
 * @param {Readonly<NodeLike>} node - an `IfStatement`.
 * @param {StatementNpath} statementNpath - computes a nested statement's own NPath.
 * @returns {number} the `if` statement's NPath.
 */
const npathOfIf = (node: Readonly<NodeLike>, statementNpath: StatementNpath): number => {
  if (!isNodeOfType(node, "IfStatement")) {
    return BASE_PATH;
  }
  const consequentNpath = statementNpath(node.consequent);
  const testNpath = npathExpression(node.test);
  if (node.alternate) {
    return testNpath + consequentNpath + statementNpath(node.alternate);
  }
  return testNpath + consequentNpath + BASE_PATH;
};

/**
 * A labeled statement (`label: statement`) has the same NPath as the statement it labels.
 * @param {Readonly<NodeLike>} node - a `LabeledStatement`.
 * @param {StatementNpath} statementNpath - computes a nested statement's own NPath.
 * @returns {number} the labeled statement's NPath.
 */
const npathOfLabeled = (node: Readonly<NodeLike>, statementNpath: StatementNpath): number => {
  if (!isNodeOfType(node, "LabeledStatement")) {
    return BASE_PATH;
  }
  return statementNpath(node.body);
};

/**
 * A `return` statement's NPath: its (optional) argument's own NPath.
 * @param {Readonly<NodeLike>} node - a `ReturnStatement`.
 * @returns {number} the statement's NPath.
 */
const npathOfReturn = (node: Readonly<NodeLike>): number => {
  if (!isNodeOfType(node, "ReturnStatement")) {
    return BASE_PATH;
  }
  return npathExpression(node.argument);
};

/**
 * `switch (C) { case ...: S }` = NP(C) + sum(NP(case bodies)), +1 more with no `default`.
 * @param {Readonly<NodeLike>} node - a `SwitchStatement`.
 * @param {StatementNpath} statementNpath - computes a nested statement's own NPath.
 * @returns {number} the switch's NPath.
 */
const npathOfSwitch = (node: Readonly<NodeLike>, statementNpath: StatementNpath): number => {
  if (!isNodeOfType(node, "SwitchStatement")) {
    return BASE_PATH;
  }
  const sum = node.cases.reduce(
    (total, switchCase) => total + npathBlockBody(switchCase.consequent, statementNpath),
    ZERO_PATHS,
  );
  const hasDefault = node.cases.some((switchCase) => !switchCase.test);
  if (hasDefault) {
    return npathExpression(node.discriminant) + sum;
  }
  return npathExpression(node.discriminant) + sum + BASE_PATH;
};

/**
 * A `throw` statement's NPath: its argument's own NPath.
 * @param {Readonly<NodeLike>} node - a `ThrowStatement`.
 * @returns {number} the statement's NPath.
 */
const npathOfThrow = (node: Readonly<NodeLike>): number => {
  if (!isNodeOfType(node, "ThrowStatement")) {
    return BASE_PATH;
  }
  return npathExpression(node.argument);
};

/**
 * `try B catch (e) C finally F` = NP(F) * (NP(B) + NP(C)); NP(F) defaults to 1 with no
 * `finally`, NP(C) defaults to 0 with no `catch`.
 * @param {Readonly<NodeLike>} node - a `TryStatement`.
 * @param {StatementNpath} statementNpath - computes a nested statement's own NPath.
 * @returns {number} the try statement's NPath.
 */
const npathOfTry = (node: Readonly<NodeLike>, statementNpath: StatementNpath): number => {
  if (!isNodeOfType(node, "TryStatement")) {
    return BASE_PATH;
  }
  const tryNpath = statementNpath(node.block);
  let catchNpath = ZERO_PATHS;
  let finallyNpath = BASE_PATH;
  if (node.handler) {
    catchNpath = statementNpath(node.handler.body);
  }
  if (node.finalizer) {
    finallyNpath = statementNpath(node.finalizer);
  }
  return finallyNpath * (tryNpath + catchNpath);
};

/**
 * A variable declaration (`const a = x, b = y;`) multiplies each initializer's NPath (paths
 * compose, same reasoning as a block body).
 * @param {Readonly<NodeLike>} node - a `VariableDeclaration`.
 * @returns {number} the statement's NPath.
 */
const npathOfVariableDeclaration = (node: Readonly<NodeLike>): number => {
  if (!isNodeOfType(node, "VariableDeclaration")) {
    return BASE_PATH;
  }
  let product = BASE_PATH;
  for (const declarator of node.declarations) {
    if (declarator.init) {
      product *= npathExpression(declarator.init);
    }
  }
  return product;
};

/**
 * `while (C) B` / `do B while (C)` = NP(C) + NP(B) + 1.
 * @param {Readonly<NodeLike>} node - a `WhileStatement` or `DoWhileStatement`.
 * @param {StatementNpath} statementNpath - computes a nested statement's own NPath.
 * @returns {number} the loop's NPath.
 */
const npathOfWhileLike = (node: Readonly<NodeLike>, statementNpath: StatementNpath): number => {
  if (isNodeOfType(node, "WhileStatement") || isNodeOfType(node, "DoWhileStatement")) {
    return npathExpression(node.test) + statementNpath(node.body) + BASE_PATH;
  }
  return BASE_PATH;
};

/**
 * Dispatches a statement to its `npathOf*` formula via a lookup table. A statement with
 * no table entry (assignments, plain calls, ...) contributes exactly 1 path.
 * @param {Readonly<NodeLike>} node - the statement to measure.
 * @returns {number} the statement's NPath.
 */
const npathStatement = (node: Readonly<NodeLike>): number => {
  const handlers = {
    BlockStatement: npathOfBlock,
    DoWhileStatement: npathOfWhileLike,
    ExpressionStatement: npathOfExpressionStatement,
    ForInStatement: npathOfForInOf,
    ForOfStatement: npathOfForInOf,
    ForStatement: npathOfFor,
    IfStatement: npathOfIf,
    LabeledStatement: npathOfLabeled,
    ReturnStatement: npathOfReturn,
    SwitchStatement: npathOfSwitch,
    ThrowStatement: npathOfThrow,
    TryStatement: npathOfTry,
    VariableDeclaration: npathOfVariableDeclaration,
    WhileStatement: npathOfWhileLike,
  };
  const resolvedHandler = lookupOwn(handlers, node.type);
  if (resolvedHandler) {
    return resolvedHandler(node, npathStatement);
  }
  return BASE_PATH;
};

/**
 * Computes the whole-function NPath: {@link npathBlockBody} over a block body, or a bare
 * expression's own NPath for an arrow function's expression body (`() => expr`).
 * @param {DeepReadonly<ESTree.Function>} root - the function/method node to measure.
 * @returns {number} the function's NPath complexity.
 */
const npathTotal = (root: DeepReadonly<ESTree.Function>): number => {
  const { body } = root;
  if (!body) {
    return BASE_PATH;
  }
  if (isNodeOfType(body, "BlockStatement")) {
    return npathBlockBody(body.body, npathStatement);
  }
  return npathExpression(body);
};

export { npathTotal as npathComplexity };
