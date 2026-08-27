import type { Context, ESTree, Rule } from "@oxlint/plugins";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { FUNCTION_LIKE_TYPES } from "#utils/ast.js";
import { cyclomaticComplexity } from "#utils/complexity.js";
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
 * Ported from phpmd's `CyclomaticComplexity` rule (codesize.xml).
 * https://phpmd.org/rules/codesize.html#cyclomaticcomplexity
 *
 * phpmd's `showClassesComplexity`/`showMethodsComplexity` properties only
 * control whether aggregate averages are added to phpmd's own report output;
 * they don't affect which individual methods/functions violate the rule, so
 * they have no equivalent behavior here — accepted in the schema for config
 * parity but otherwise unused.
 */
const cyclomaticComplexityRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const DEFAULT_REPORT_LEVEL = 10;
    const reportLevel = getNumberOption(context.options, "reportLevel", DEFAULT_REPORT_LEVEL);
    const visitFunctionLike = (node: SpanLike): void => {
      // The `!node.body` half also excludes TSDeclareFunction /
      // TSEmptyBodyFunctionExpression: signature only, nothing to measure.
      if (!isFunctionNode(node) || !node.body) {
        return;
      }
      const complexity = cyclomaticComplexity(node);
      const { kind, name } = describeFunctionLike(node);
      if (complexity < reportLevel) {
        return;
      }
      context.report({
        data: { complexity, kind, name, reportLevel },
        loc: node.loc,
        messageId: "tooComplex",
      });
    };
    return Object.fromEntries(FUNCTION_LIKE_TYPES.map((type) => [type, visitFunctionLike]));
  },
  meta: {
    docs: {
      description:
        "Disallow functions and methods with a cyclomatic complexity at or above a configured threshold.",
      url: "https://phpmd.org/rules/codesize.html#cyclomaticcomplexity",
    },
    messages: {
      tooComplex:
        "The {{kind}} '{{name}}' has a Cyclomatic Complexity of {{complexity}}. The configured cyclomatic complexity threshold is {{reportLevel}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          reportLevel: { type: "number" },
          showClassesComplexity: { type: "boolean" },
          showMethodsComplexity: { type: "boolean" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { cyclomaticComplexityRule };
