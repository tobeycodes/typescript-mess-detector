import type { Context, ESTree, Rule } from "@oxlint/plugins";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { FUNCTION_LIKE_TYPES } from "#utils/ast.js";
import { describeFunctionLike } from "#utils/function-info.js";
import { getNumberOption } from "#utils/options.js";

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
 * Ported from phpmd's `ExcessiveParameterList` rule (`LongParameterList.php`, codesize.xml).
 * https://phpmd.org/rules/codesize.html#excessiveparameterlist
 */
const longParameterListRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const DEFAULT_MINIMUM = 10;
    const minimum = getNumberOption(context.options, "minimum", DEFAULT_MINIMUM);
    const visitFunctionLike = (node: SpanLike): void => {
      if (!isFunctionNode(node)) {
        return;
      }
      const count = node.params.length;
      const { kind, name } = describeFunctionLike(node);
      if (count < minimum) {
        return;
      }
      context.report({
        data: { count, kind, minimum, name },
        loc: node.loc,
        messageId: "tooManyParameters",
      });
    };
    return Object.fromEntries(FUNCTION_LIKE_TYPES.map((type) => [type, visitFunctionLike]));
  },
  meta: {
    docs: {
      description:
        "Disallow functions and methods with at or more than a configured number of parameters.",
      url: "https://phpmd.org/rules/codesize.html#excessiveparameterlist",
    },
    messages: {
      tooManyParameters:
        "The {{kind}} '{{name}}' has {{count}} parameters. Consider reducing the number of parameters to less than {{minimum}}.",
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

export { longParameterListRule };
