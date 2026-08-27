import type { Context, ESTree, Rule } from "@oxlint/plugins";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { getNumberOption } from "#utils/options.js";

/* Structural minimum every AST node satisfies. */
interface SpanLike {
  readonly type: string;
  readonly loc: {
    readonly start: { readonly line: number; readonly column: number };
    readonly end: { readonly line: number; readonly column: number };
  };
}

const isClassNode = (node: SpanLike): node is DeepReadonly<ESTree.Class> => "body" in node;

const isFieldMember = (member: DeepReadonly<ESTree.ClassElement>): boolean =>
  member.type === "PropertyDefinition" || member.type === "AccessorProperty";

/**
 * Ported from phpmd's `TooManyFields` rule (codesize.xml).
 * https://phpmd.org/rules/codesize.html#toomanyfields
 *
 * phpmd's `vars` metric counts every declared property regardless of
 * visibility, so this counts every `PropertyDefinition` (and `accessor`
 * fields, the closest TS equivalent of a backed property) irrespective of
 * `public`/`private`/`protected`. Only `ClassDeclaration` is checked — the
 * PHP rule is `ClassAware` only, not `InterfaceAware`.
 */
const tooManyFieldsRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const DEFAULT_MAXFIELDS = 15;
    const maxfields = getNumberOption(context.options, "maxfields", DEFAULT_MAXFIELDS);
    return {
      ClassDeclaration(node: SpanLike) {
        if (!isClassNode(node)) {
          return;
        }
        const count = node.body.body.filter(isFieldMember).length;
        if (count <= maxfields) {
          return;
        }
        let name = "anonymous";
        if (node.id) {
          ({ name } = node.id);
        }
        context.report({
          data: { count, maxfields, name },
          loc: node.loc,
          messageId: "tooManyFields",
        });
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow classes with more than a configured maximum number of fields.",
      url: "https://phpmd.org/rules/codesize.html#toomanyfields",
    },
    messages: {
      tooManyFields:
        "The class {{name}} has {{count}} fields. Consider redesigning {{name}} to keep the number of fields under {{maxfields}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          maxfields: { type: "number" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { tooManyFieldsRule };
