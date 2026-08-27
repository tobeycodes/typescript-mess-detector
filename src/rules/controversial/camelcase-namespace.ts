import { getBooleanOption, getListOption } from "#utils/options.js";
import type { Rule } from "@oxlint/plugins";
import { isPascalCase } from "#utils/casing.js";

/** Minimal, fully-readonly view of a plain (non-dotted) identifier segment. */
interface NamedSegment {
  readonly name: string;
  readonly type: "Identifier";
}

/**
 * Minimal, fully-readonly view of the one other shape `namespaceParts` may recurse
 * into: real `TSQualifiedName.left` is a `TSTypeName` (`IdentifierReference |
 * TSQualifiedName | ThisExpression`), and `this` can't carry a name, so it always
 * falls through `namespaceParts`'s fallback branch.
 */
interface ThisSegment {
  readonly type: "ThisExpression";
}

/** Minimal, fully-readonly view of a dotted `namespace Foo.Bar` id segment. */
interface QualifiedSegment {
  readonly left: NamedSegment | QualifiedSegment | ThisSegment;
  readonly right: Readonly<{ readonly name: string }>;
  readonly type: "TSQualifiedName";
}

/**
 * Every shape `namespaceParts` may see, at the top level (`TSModuleDeclaration["id"]` or
 * the `global`-flavored `TSGlobalDeclaration["id"]`) or recursively via a
 * `TSQualifiedName`'s `left`.
 */
type NamespaceId = NamedSegment | QualifiedSegment | ThisSegment;

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
 * Flattens a (possibly dotted) `namespace Foo.Bar.Baz` id into its name parts.
 * @param {Readonly<NamespaceId>} id - The namespace identifier node (a plain
 *   identifier or a dotted qualified name).
 * @returns {string[]} The dot-separated name segments, in left-to-right order.
 */
const namespaceParts = (id: Readonly<NamespaceId>): string[] => {
  if (id.type === "Identifier") {
    return [id.name];
  }
  if (id.type === "TSQualifiedName") {
    return [...namespaceParts(id.left), id.right.name];
  }
  return [];
};

/**
 * Ported from phpmd's `CamelCaseNamespace` rule (controversial.xml).
 * https://phpmd.org/rules/controversial.html
 *
 * PHP namespaces (backslash-separated) are mapped to TypeScript's `namespace`/`module`
 * declarations (dot-separated), checking each dotted segment.
 */
const camelCaseNamespaceRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const camelcaseAbbreviations = getBooleanOption(
      context.options,
      "camelcase-abbreviations",
      false,
    );
    const exceptions = new Set(getListOption(context.options, "exceptions"));
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      TSModuleDeclaration(node) {
        if (node.id.type === "Literal") {
          return;
        }
        const parts = namespaceParts(node.id);
        for (const name of parts) {
          if (!exceptions.has(name) && !isPascalCase(name, { camelcaseAbbreviations })) {
            context.report({
              data: { name, namespace: parts.join(".") },
              loc: node.loc,
              messageId: "notCamelCase",
            });
          }
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Require each segment of a TypeScript namespace declaration to be named in CamelCase.",
    },
    messages: {
      notCamelCase: "The name '{{name}}' in namespace '{{namespace}}' is not named in CamelCase.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          "camelcase-abbreviations": { type: "boolean" },
          exceptions: { type: "string" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { camelCaseNamespaceRule };
