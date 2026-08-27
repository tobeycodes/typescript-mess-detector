import type { Context, Rule } from "@oxlint/plugins";
import { getListOption, getNumberOption } from "#utils/options.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";

interface LineColumn {
  readonly column: number;
  readonly line: number;
}

interface NodeLocation {
  readonly end: Readonly<LineColumn>;
  readonly start: Readonly<LineColumn>;
}

/** Minimal, fully-readonly view of the fields this rule reads off a class/interface name. */
type NamedNode = Readonly<{ loc: Readonly<NodeLocation>; name: string }>;

/**
 * Ported from phpmd's `ShortClassName` rule (naming.xml).
 * https://phpmd.org/rules/naming.html#shortclassname
 */
export const shortClassNameRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const DEFAULT_MINIMUM = 3;
    const check = (id: NamedNode, minimum: number, exceptions: readonly string[]): void => {
      if (id.name.length >= minimum || exceptions.includes(id.name)) {
        return;
      }
      context.report({ data: { minimum, name: id.name }, loc: id.loc, messageId: "tooShort" });
    };
    const exceptions = getListOption(context.options, "exceptions");
    const minimum = getNumberOption(context.options, "minimum", DEFAULT_MINIMUM);
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      ClassDeclaration(node) {
        if (!node.id) {
          return;
        }
        check(node.id, minimum, exceptions);
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      TSInterfaceDeclaration(node) {
        check(node.id, minimum, exceptions);
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow class/interface names shorter than a configured minimum length.",
      url: "https://phpmd.org/rules/naming.html#shortclassname",
    },
    messages: {
      tooShort:
        "Avoid classes with short names like '{{name}}'. Configured minimum length is {{minimum}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          exceptions: { type: "string" },
          minimum: { type: "number" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};
