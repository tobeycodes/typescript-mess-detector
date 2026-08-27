import type { ESTree, Ranged, Rule } from "@oxlint/plugins";
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
      readonly data: Readonly<Record<string, string>>;
      readonly loc: Readonly<NodeLocation>;
      readonly messageId: string;
    }>,
  ) => void;
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
  readonly sourceCode: Readonly<{ getText: (node: Ranged) => string }>;
}

/**
 * Ported from phpmd's `CountInLoopExpression` rule (design.xml).
 * https://phpmd.org/rules/design.html#countinloopexpression
 *
 * phpmd flags calling PHP's `count()`/`sizeof()` inside a loop's condition, because
 * in PHP that recomputes the count from scratch on every iteration. That rationale
 * doesn't transfer to JS: `array.length` is an O(1) property read, not a recomputed
 * function call, so a direct "flag `.length` in a loop test" port would be flagging
 * something harmless.
 *
 * What *does* carry the same footgun is measuring the length of a value produced by
 * a call expression evaluated directly in the loop test — e.g. `Object.keys(x).length`,
 * `Array.from(x).length`, `arr.filter(f).length` — since the call (and therefore the
 * whole collection) is genuinely re-executed on every iteration. This port narrows
 * the rule to that pattern: a non-computed `.length` member access whose object is a
 * `CallExpression`, anywhere inside a `for`/`while`/`do...while` test.
 */
type Node = ESTree.Node & { parent?: ESTree.Node | null };

const EMPTY_STACK_LENGTH = 0;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
const enqueueArrayElements = (stack: unknown[], items: readonly unknown[]): void => {
  for (const element of items) {
    stack.push(element);
  }
};

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
const enqueueChildValues = (stack: unknown[], node: DeepReadonly<Node>): void => {
  for (const [key, value] of Object.entries(node)) {
    if (key !== "parent") {
      stack.push(value);
    }
  }
};

const isLengthOfCall = (
  node: DeepReadonly<Node>,
): node is ESTree.MemberExpression & { object: ESTree.CallExpression } =>
  node.type === "MemberExpression" &&
  !node.computed &&
  node.property.type === "Identifier" &&
  node.property.name === "length" &&
  node.object.type === "CallExpression";

const isNodeLike = <TCandidate>(value: TCandidate): value is TCandidate & Node =>
  value !== null && typeof value === "object" && "type" in value && typeof value.type === "string";

/**
 * Walks every descendant of `root` (inclusive) looking for `<call-expression>.length` accesses.
 * @param {DeepReadonly<ESTree.Node>} root - The AST subtree to search (typically a loop test expression).
 * @returns {ESTree.MemberExpression[]} Every matching `.length` member access found, in discovery order.
 */
const locateLengthOfCallAccesses = (root: DeepReadonly<ESTree.Node>): ESTree.MemberExpression[] => {
  const found: ESTree.MemberExpression[] = [];
  const stack: unknown[] = [root];
  const visit = <TCandidate>(item: TCandidate): item is TCandidate & Node => {
    if (Array.isArray(item)) {
      enqueueArrayElements(stack, item);
      return false;
    }
    if (!isNodeLike(item)) {
      return false;
    }
    if (isLengthOfCall(item)) {
      found.push(item);
    }
    enqueueChildValues(stack, item);
    return true;
  };
  while (stack.length > EMPTY_STACK_LENGTH) {
    visit(stack.pop());
  }
  return found;
};

const countInLoopExpressionRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const checkTest = (test: DeepReadonly<ESTree.Expression>): void => {
      for (const node of locateLengthOfCallAccesses(test)) {
        context.report({
          data: { expression: context.sourceCode.getText(node) },
          loc: node.loc,
          messageId: "countInLoop",
        });
      }
    };
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      DoWhileStatement(node) {
        checkTest(node.test);
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      ForStatement(node) {
        if (node.test) {
          checkTest(node.test);
        }
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      WhileStatement(node) {
        checkTest(node.test);
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow measuring the .length of a freshly computed value (e.g. Object.keys(x).length) inside a loop condition, since it's recomputed on every iteration.",
      url: "https://phpmd.org/rules/design.html#countinloopexpression",
    },
    messages: {
      countInLoop:
        "Avoid computing '{{expression}}' inside a loop condition; it is recomputed on every iteration. Hoist it into a variable before the loop.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { countInLoopExpressionRule };
