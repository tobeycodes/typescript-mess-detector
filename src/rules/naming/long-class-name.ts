import type { Context, Rule } from "@oxlint/plugins";
import { getListOption, getNumberOption } from "#utils/options.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { lengthWithoutPrefixesAndSuffixes } from "#utils/names.js";

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
 * Ported from phpmd's `LongClassName` rule (naming.xml).
 * https://phpmd.org/rules/naming.html#longclassname
 */
export const longClassNameRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const DEFAULT_MAXIMUM = 40;
    const check = (
      id: NamedNode,
      settings: Readonly<{
        maximum: number;
        prefixes: readonly string[];
        suffixes: readonly string[];
      }>,
    ): void => {
      const { length } = lengthWithoutPrefixesAndSuffixes(
        id.name,
        settings.prefixes,
        settings.suffixes,
      );
      if (length <= settings.maximum) {
        return;
      }
      context.report({
        data: { maximum: settings.maximum, name: id.name },
        loc: id.loc,
        messageId: "tooLong",
      });
    };
    const settings = {
      maximum: getNumberOption(context.options, "maximum", DEFAULT_MAXIMUM),
      prefixes: getListOption(context.options, "subtract-prefixes"),
      suffixes: getListOption(context.options, "subtract-suffixes"),
    };
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      ClassDeclaration(node) {
        if (!node.id) {
          return;
        }
        check(node.id, settings);
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      TSInterfaceDeclaration(node) {
        check(node.id, settings);
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow class/interface names longer than a configured maximum length.",
      url: "https://phpmd.org/rules/naming.html#longclassname",
    },
    messages: {
      tooLong:
        "Avoid excessively long class names like '{{name}}'. Keep class name length under {{maximum}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          maximum: { type: "number" },
          "subtract-prefixes": { type: "string" },
          "subtract-suffixes": { type: "string" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};
