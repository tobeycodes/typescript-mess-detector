import type { Context, ESTree, Rule } from "@oxlint/plugins";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { cyclomaticComplexity } from "#utils/complexity.js";
import { getNumberOption } from "#utils/options.js";

/* Structural minimum every AST node satisfies. */
interface SpanLike {
  readonly type: string;
  readonly loc: {
    readonly start: { readonly line: number; readonly column: number };
    readonly end: { readonly line: number; readonly column: number };
  };
}

const isClassNode = (node: SpanLike): node is ESTree.Class => "body" in node;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
const methodComplexitySum = (members: readonly ESTree.ClassElement[]): number => {
  let complexity = 0;
  for (const member of members) {
    if (member.type === "MethodDefinition" && member.value.body) {
      complexity += cyclomaticComplexity(member.value);
    }
  }
  return complexity;
};

/**
 * Ported from phpmd's `WeightedMethodCount` rule (`ExcessiveClassComplexity` in
 * codesize.xml). https://phpmd.org/rules/codesize.html#excessiveclasscomplexity
 *
 * WMC = the sum of the cyclomatic complexity of every method declared
 * directly in the class (methods without a body, e.g. `TSAbstractMethodDefinition`
 * overload signatures, contribute 0). Only `ClassDeclaration` is checked —
 * the PHP rule is `ClassAware` only, not `InterfaceAware`.
 */
const excessiveClassComplexityRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const DEFAULT_MAXIMUM = 50;
    const maximum = getNumberOption(context.options, "maximum", DEFAULT_MAXIMUM);
    return {
      ClassDeclaration(node: SpanLike) {
        if (!isClassNode(node)) {
          return;
        }
        const complexity = methodComplexitySum(node.body.body);
        let name = "anonymous";
        if (complexity < maximum) {
          return;
        }
        if (node.id) {
          ({ name } = node.id);
        }
        context.report({
          data: { complexity, maximum, name },
          loc: node.loc,
          messageId: "tooComplex",
        });
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow classes with a weighted method complexity (WMC) at or above a configured maximum.",
      url: "https://phpmd.org/rules/codesize.html#excessiveclasscomplexity",
    },
    messages: {
      tooComplex:
        "The class {{name}} has an overall complexity of {{complexity}} which is very high. The configured complexity threshold is {{maximum}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          maximum: { type: "number" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { excessiveClassComplexityRule };
