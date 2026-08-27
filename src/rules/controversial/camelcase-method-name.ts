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
 * Ported from phpmd's `CamelCaseMethodName` rule (controversial.xml).
 * https://phpmd.org/rules/controversial.html
 *
 * phpmd exempts PHP's magic methods (`__construct`, `__toString`, ...). The closest
 * TS/JS equivalent is the `constructor` method and well-known symbol-keyed methods,
 * which are excluded here; ordinary methods named e.g. `toString` are still checked.
 */
export const camelCaseMethodNameRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const allowUnderscore = getBooleanOption(context.options, "allow-underscore", false);
    const allowUnderscoreTest = getBooleanOption(context.options, "allow-underscore-test", false);
    const camelcaseAbbreviations = getBooleanOption(
      context.options,
      "camelcase-abbreviations",
      false,
    );
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      MethodDefinition(node) {
        if (node.kind === "constructor" || node.key.type !== "Identifier" || node.computed) {
          return;
        }
        const { name } = node.key;
        if (isCamelCase(name, { allowUnderscore, allowUnderscoreTest, camelcaseAbbreviations })) {
          return;
        }
        context.report({ data: { name }, loc: node.key.loc, messageId: "notCamelCase" });
      },
    };
  },
  meta: {
    docs: {
      description: "Require class methods to be named in camelCase.",
    },
    messages: {
      notCamelCase: "The method '{{name}}' is not named in camelCase.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          "allow-underscore": { type: "boolean" },
          "allow-underscore-test": { type: "boolean" },
          "camelcase-abbreviations": { type: "boolean" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};
