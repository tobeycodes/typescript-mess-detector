import type { Context, ESTree, Rule } from "@oxlint/plugins";
import { getBooleanOption, getNumberOption } from "#utils/options.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { countLines } from "#utils/line-count.js";

/* Structural minimum every AST node satisfies. */
interface SpanLike {
  readonly type: string;
  readonly loc: {
    readonly start: { readonly line: number; readonly column: number };
    readonly end: { readonly line: number; readonly column: number };
  };
}

const isClassNode = (node: SpanLike): node is ESTree.Class => "body" in node;

/**
 * Ported from phpmd's `ExcessiveClassLength` rule (`LongClass.php`, codesize.xml).
 * https://phpmd.org/rules/codesize.html#excessiveclasslength
 *
 * phpmd's `LongClass` is `ClassAware` only (not `InterfaceAware`), so it does
 * not apply to interfaces — matched here by only listening for `ClassDeclaration`.
 */
const longClassRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const DEFAULT_MINIMUM = 1000;
    const ignoreWhitespace = getBooleanOption(context.options, "ignore-whitespace", false);
    const minimum = getNumberOption(context.options, "minimum", DEFAULT_MINIMUM);
    return {
      ClassDeclaration(node: SpanLike) {
        if (!isClassNode(node)) {
          return;
        }
        const lines = countLines(node, context.sourceCode.lines, ignoreWhitespace);
        if (lines < minimum) {
          return;
        }
        let name = "anonymous";
        if (node.id) {
          ({ name } = node.id);
        }
        context.report({ data: { lines, minimum, name }, loc: node.loc, messageId: "tooLong" });
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow classes spanning at or more than a configured number of lines.",
      url: "https://phpmd.org/rules/codesize.html#excessiveclasslength",
    },
    messages: {
      tooLong:
        "The class {{name}} has {{lines}} lines of code. Current threshold is {{minimum}}. Avoid really long classes.",
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

export { longClassRule };
