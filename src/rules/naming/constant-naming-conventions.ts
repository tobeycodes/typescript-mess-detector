import type { Context, Rule } from "@oxlint/plugins";
import type { DeepReadonly } from "#utils/deep-readonly.js";

interface LineColumn {
  readonly column: number;
  readonly line: number;
}

interface NodeLocation {
  readonly end: Readonly<LineColumn>;
  readonly start: Readonly<LineColumn>;
}

/** Minimal, fully-readonly view of the fields this rule reads off a name-bearing node. */
type NamedNode = Readonly<{ loc: Readonly<NodeLocation>; name: string }>;

/**
 * Ported from phpmd's `ConstantNamingConventions` rule (naming.xml).
 * https://phpmd.org/rules/naming.html#constantnamingconventions
 *
 * PHP class/interface constants map most closely to TypeScript `static readonly`
 * class fields and enum members, since JS/TS has no dedicated `const` class member kind.
 */
export const constantNamingConventionsRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const check = (id: NamedNode): void => {
      if (id.name === id.name.toUpperCase()) {
        return;
      }
      context.report({ data: { name: id.name }, loc: id.loc, messageId: "notUppercase" });
    };
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      PropertyDefinition(node) {
        if (!node.static || node.readonly !== true) {
          return;
        }
        if (node.key.type !== "Identifier" || node.computed) {
          return;
        }
        check(node.key);
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      TSEnumMember(node) {
        if (node.id.type !== "Identifier") {
          return;
        }
        check(node.id);
      },
    };
  },
  meta: {
    docs: {
      description:
        "Require class constants (static readonly fields) and enum members to be named in uppercase.",
      url: "https://phpmd.org/rules/naming.html#constantnamingconventions",
    },
    messages: {
      notUppercase: "Constant {{name}} should be defined in uppercase",
    },
    type: "suggestion",
  },
};
