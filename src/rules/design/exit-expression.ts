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
 * Ported from phpmd's `ExitExpression` rule (design.xml).
 * https://phpmd.org/rules/design.html#exitexpression
 *
 * PHP's `exit`/`die` is a language construct with no direct JS/TS equivalent. The
 * closest real-world analogue is Node's `process.exit()`: like PHP's `exit`, it's an
 * abrupt, untestable termination of the whole process that's easy to bury inside
 * otherwise-ordinary application code. This rule flags calls to `process.exit(...)`.
 */
export const exitExpressionRule: Rule = {
  create(context: Readonly<RuleContext>) {
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== "MemberExpression" || callee.computed) {
          return;
        }
        if (callee.object.type !== "Identifier" || callee.object.name !== "process") {
          return;
        }
        if (callee.property.type !== "Identifier" || callee.property.name !== "exit") {
          return;
        }
        context.report({ loc: node.loc, messageId: "exitExpression" });
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow calling process.exit() from application code.",
      url: "https://phpmd.org/rules/design.html#exitexpression",
    },
    messages: {
      exitExpression:
        "Calling 'process.exit()' is untestable and terminates the process abruptly. Consider throwing or returning an error instead.",
    },
    schema: [],
    type: "problem",
  },
};
