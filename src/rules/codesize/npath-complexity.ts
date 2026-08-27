import type { Context, ESTree, Rule } from "@oxlint/plugins";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { FUNCTION_LIKE_TYPES } from "#utils/ast.js";
import { describeFunctionLike } from "#utils/function-info.js";
import { getNumberOption } from "#utils/options.js";
import { npathComplexity } from "#utils/npath.js";

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
 * Ported from phpmd's `NPathComplexity` rule (codesize.xml).
 * https://phpmd.org/rules/codesize.html#npathcomplexity
 *
 * See `src/utils/npath.ts` for the algorithm.
 */
const npathComplexityRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const DEFAULT_MINIMUM = 200;
    const minimum = getNumberOption(context.options, "minimum", DEFAULT_MINIMUM);
    const visitFunctionLike = (node: SpanLike): void => {
      // The `!node.body` half also excludes TSDeclareFunction /
      // TSEmptyBodyFunctionExpression: signature only, nothing to measure.
      if (!isFunctionNode(node) || !node.body) {
        return;
      }
      const npath = npathComplexity(node);
      const { kind, name } = describeFunctionLike(node);
      if (npath < minimum) {
        return;
      }
      context.report({
        data: { kind, minimum, name, npath },
        loc: node.loc,
        messageId: "tooComplex",
      });
    };
    return Object.fromEntries(FUNCTION_LIKE_TYPES.map((type) => [type, visitFunctionLike]));
  },
  meta: {
    docs: {
      description:
        "Disallow functions and methods with an NPath complexity at or above a configured threshold.",
      url: "https://phpmd.org/rules/codesize.html#npathcomplexity",
    },
    messages: {
      tooComplex:
        "The {{kind}} '{{name}}' has an NPath complexity of {{npath}}. The configured NPath complexity threshold is {{minimum}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          minimum: { type: "number" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { npathComplexityRule };
