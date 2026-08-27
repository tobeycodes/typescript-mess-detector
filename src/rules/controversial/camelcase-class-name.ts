import type { Rule } from "@oxlint/plugins";
import { getBooleanOption } from "#utils/options.js";
import { isPascalCase } from "#utils/casing.js";

interface LineColumn {
  readonly column: number;
  readonly line: number;
}

interface NodeLocation {
  readonly end: Readonly<LineColumn>;
  readonly start: Readonly<LineColumn>;
}

/** Minimal, fully-readonly view of the fields this rule reads off an identifier node. */
interface NamedNode {
  readonly loc: Readonly<NodeLocation>;
  readonly name: string;
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
 * Ported from phpmd's `CamelCaseClassName` rule (controversial.xml).
 * https://phpmd.org/rules/controversial.html
 */
export const camelCaseClassNameRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const camelcaseAbbreviations = getBooleanOption(
      context.options,
      "camelcase-abbreviations",
      false,
    );
    const check = (id: Readonly<NamedNode>): void => {
      const { name } = id;
      if (isPascalCase(name, { camelcaseAbbreviations })) {
        return;
      }
      context.report({ data: { name }, loc: id.loc, messageId: "notCamelCase" });
    };
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      ClassDeclaration(node) {
        if (node.id) {
          check(node.id);
        }
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      TSEnumDeclaration(node) {
        check(node.id);
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      TSInterfaceDeclaration(node) {
        check(node.id);
      },
    };
  },
  meta: {
    docs: {
      description: "Require classes, interfaces, and enums to be named in CamelCase.",
    },
    messages: {
      notCamelCase: "The class '{{name}}' is not named in CamelCase.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          "camelcase-abbreviations": { type: "boolean" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};
