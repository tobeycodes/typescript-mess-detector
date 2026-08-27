import type { Context, ESTree, Rule } from "@oxlint/plugins";
import { getBooleanOption, getNumberOption } from "#utils/options.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { FUNCTION_LIKE_TYPES } from "#utils/ast.js";
import { countLines } from "#utils/line-count.js";
import { describeFunctionLike } from "#utils/function-info.js";

/* Structural minimum every AST node satisfies. */
interface SpanLike {
  readonly type: string;
  readonly loc: {
    readonly start: { readonly line: number; readonly column: number };
    readonly end: { readonly line: number; readonly column: number };
  };
}

const isFunctionNode = (node: SpanLike): node is ESTree.Function => "params" in node;

/**
 * Ported from phpmd's `ExcessiveMethodLength` rule (`LongMethod.php`, codesize.xml).
 * https://phpmd.org/rules/codesize.html#excessivemethodlength
 */
const longMethodRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const DEFAULT_MINIMUM = 100;
    const ignoreWhitespace = getBooleanOption(context.options, "ignore-whitespace", false);
    const minimum = getNumberOption(context.options, "minimum", DEFAULT_MINIMUM);
    const visitFunctionLike = (node: SpanLike): void => {
      // The `!node.body` half also excludes TSDeclareFunction /
      // TSEmptyBodyFunctionExpression: signature only, nothing to measure.
      if (!isFunctionNode(node) || !node.body) {
        return;
      }
      const lines = countLines(node, context.sourceCode.lines, ignoreWhitespace);
      const { kind, name } = describeFunctionLike(node);
      if (lines < minimum) {
        return;
      }
      context.report({
        data: { kind, lines, minimum, name },
        loc: node.loc,
        messageId: "tooLong",
      });
    };
    return Object.fromEntries(FUNCTION_LIKE_TYPES.map((type) => [type, visitFunctionLike]));
  },
  meta: {
    docs: {
      description:
        "Disallow functions and methods spanning at or more than a configured number of lines.",
      url: "https://phpmd.org/rules/codesize.html#excessivemethodlength",
    },
    messages: {
      tooLong:
        "The {{kind}} '{{name}}' has {{lines}} lines of code. Current threshold is set to {{minimum}}. Avoid really long methods.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          "ignore-whitespace": { type: "boolean" },
          minimum: { type: "number" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { longMethodRule };
