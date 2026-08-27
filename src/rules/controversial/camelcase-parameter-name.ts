import type { ESTree, Rule } from "@oxlint/plugins";
import { FUNCTION_LIKE_TYPES } from "#utils/ast.js";
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
 * Ported from phpmd's `CamelCaseParameterName` rule (controversial.xml).
 * https://phpmd.org/rules/controversial.html
 */
export const camelCaseParameterNameRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const allowUnderscore = getBooleanOption(context.options, "allow-underscore", false);
    const camelcaseAbbreviations = getBooleanOption(
      context.options,
      "camelcase-abbreviations",
      false,
    );
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
    const checkParams = (node: ESTree.Function): void => {
      for (const param of node.params) {
        let target = param;
        if (target.type === "AssignmentPattern") {
          target = target.left;
        }
        if (target.type === "Identifier") {
          const { name } = target;
          if (!isCamelCase(name, { allowUnderscore, camelcaseAbbreviations })) {
            context.report({ data: { name }, loc: target.loc, messageId: "notCamelCase" });
          }
        }
      }
    };
    return Object.fromEntries(FUNCTION_LIKE_TYPES.map((type) => [type, checkParams]));
  },
  meta: {
    docs: {
      description: "Require function and method parameters to be named in camelCase.",
    },
    messages: {
      notCamelCase: "The parameter '{{name}}' is not named in camelCase.",
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
