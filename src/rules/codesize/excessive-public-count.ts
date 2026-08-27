import type { Context, ESTree, Rule } from "@oxlint/plugins";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { getNumberOption } from "#utils/options.js";
import { isPublicMember } from "#utils/visibility.js";

/* Structural minimum every AST node satisfies. */
interface SpanLike {
  readonly type: string;
  readonly loc: {
    readonly start: { readonly line: number; readonly column: number };
    readonly end: { readonly line: number; readonly column: number };
  };
}

const isClassNode = (node: SpanLike): node is DeepReadonly<ESTree.Class> => "body" in node;

const isCountablePublicMember = (member: DeepReadonly<ESTree.ClassElement>): boolean =>
  (member.type === "MethodDefinition" ||
    member.type === "PropertyDefinition" ||
    member.type === "AccessorProperty") &&
  (member.accessibility === null || isPublicMember(member.accessibility));

/**
 * Ported from phpmd's `ExcessivePublicCount` rule (codesize.xml).
 * https://phpmd.org/rules/codesize.html#excessivepubliccount
 *
 * phpmd's rule is `ClassAware` + `TraitAware`; TS has no trait construct, so
 * only `ClassDeclaration` is checked (not interfaces, which the PHP rule also
 * does not implement `InterfaceAware` for). Counts every public property and
 * method — including the constructor and public accessor (`accessor`) fields
 * — since PHP has no equivalent visibility-less "member kind" to exclude.
 */
const excessivePublicCountRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const DEFAULT_MINIMUM = 45;
    const minimum = getNumberOption(context.options, "minimum", DEFAULT_MINIMUM);
    return {
      ClassDeclaration(node: SpanLike) {
        if (!isClassNode(node)) {
          return;
        }
        const count = node.body.body.filter(isCountablePublicMember).length;
        if (count < minimum) {
          return;
        }
        let name = "anonymous";
        if (node.id) {
          ({ name } = node.id);
        }
        context.report({
          data: { count, minimum, name },
          loc: node.loc,
          messageId: "tooManyPublicMembers",
        });
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow classes with at or more than a configured number of public methods and fields.",
      url: "https://phpmd.org/rules/codesize.html#excessivepubliccount",
    },
    messages: {
      tooManyPublicMembers:
        "The class {{name}} has {{count}} public methods and attributes. Consider reducing the number of public items to less than {{minimum}}.",
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

export { excessivePublicCountRule };
