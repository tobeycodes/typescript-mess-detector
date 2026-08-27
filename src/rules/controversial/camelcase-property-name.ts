import type { Rule } from "@oxlint/plugins";
import { getBooleanOption } from "#utils/options.js";
import { isCamelCase } from "#utils/casing.js";

interface LineColumn {
  readonly column: number;
  readonly line: number;
}

interface NodeLocation {
  readonly end: Readonly<LineColumn>;
  readonly start: Readonly<LineColumn>;
}

/** Minimal, fully-readonly view of the oxlint rule context this rule depends on. */
interface RuleContext {
  readonly options: readonly unknown[];
  readonly report: (
    diagnostic: Readonly<{
      readonly data: Readonly<Record<string, string>>;
      readonly loc: Readonly<NodeLocation>;
      readonly messageId: string;
    }>,
  ) => void;
}

/**
 * Ported from phpmd's `CamelCasePropertyName` rule (controversial.xml).
 * https://phpmd.org/rules/controversial.html
 */
export const camelCasePropertyNameRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const allowUnderscore = getBooleanOption(context.options, "allow-underscore", false);
    const camelcaseAbbreviations = getBooleanOption(
      context.options,
      "camelcase-abbreviations",
      false,
    );
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      PropertyDefinition(node) {
        if (node.key.type !== "Identifier" || node.computed) {
          return;
        }
        const { name } = node.key;
        if (isCamelCase(name, { allowUnderscore, camelcaseAbbreviations })) {
          return;
        }
        context.report({ data: { name }, loc: node.key.loc, messageId: "notCamelCase" });
      },
    };
  },
  meta: {
    docs: {
      description: "Require class fields to be named in camelCase.",
    },
    messages: {
      notCamelCase: "The property '{{name}}' is not named in camelCase.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          "allow-underscore": { type: "boolean" },
          "camelcase-abbreviations": { type: "boolean" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};
