import { getBooleanOption, getListOption } from "#utils/options.js";
import type { Rule } from "@oxlint/plugins";
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
 * Ported from phpmd's `CamelCaseVariableName` rule (controversial.xml).
 * https://phpmd.org/rules/controversial.html
 *
 * phpmd's PHP-specific default exceptions (`$GLOBALS`, `$_SERVER`, `$php_errormsg`, ...)
 * have no TS/JS equivalent and are dropped; use the `exceptions` option instead.
 * Parameters are covered separately by `camelcase-parameter-name`, so only local
 * `var`/`let`/`const` declarations are checked here.
 */
export const camelCaseVariableNameRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const allowUnderscore = getBooleanOption(context.options, "allow-underscore", false);
    const camelcaseAbbreviations = getBooleanOption(
      context.options,
      "camelcase-abbreviations",
      false,
    );
    const exceptions = new Set(getListOption(context.options, "exceptions"));
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier") {
          return;
        }
        const { name } = node.id;
        if (exceptions.has(name)) {
          return;
        }
        if (isCamelCase(name, { allowUnderscore, camelcaseAbbreviations })) {
          return;
        }
        context.report({ data: { name }, loc: node.id.loc, messageId: "notCamelCase" });
      },
    };
  },
  meta: {
    docs: {
      description: "Require local variables to be named in camelCase.",
    },
    messages: {
      notCamelCase: "The variable '{{name}}' is not named in camelCase.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          "allow-underscore": { type: "boolean" },
          "camelcase-abbreviations": { type: "boolean" },
          exceptions: { type: "string" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};
