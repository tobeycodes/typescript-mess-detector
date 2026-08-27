import type { Context, Rule } from "@oxlint/plugins";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { getBooleanOption } from "#utils/options.js";
import { isBoolean } from "#utils/type-guards.js";

/**
 * Minimal, genuinely deep-readonly view of a TS type node: only the shape
 * `isBooleanKeyword` actually inspects.
 */
type BooleanTypeNode = Readonly<{
  literal?: Readonly<{ type: string; value?: unknown }>;
  type: string;
  types?: readonly BooleanTypeNode[];
}>;

interface LineColumn {
  readonly column: number;
  readonly line: number;
}

interface NodeLocation {
  readonly end: Readonly<LineColumn>;
  readonly start: Readonly<LineColumn>;
}

/** Minimal, fully-readonly view of the fields this rule reads off a method name. */
type NamedNode = Readonly<{ loc: Readonly<NodeLocation>; name: string }>;

/**
 * Ported from phpmd's `BooleanGetMethodName` rule (naming.xml).
 * https://phpmd.org/rules/naming.html#booleangetmethodname
 *
 * phpmd also infers a boolean return type from a `@return boolean` JSDoc-style
 * comment when there's no native type. Oxlint's plugin runtime doesn't expose
 * JSDoc comment lookup, so this port only checks TypeScript return type annotations.
 */
const GETTER_NAME = /^_?get/iu;

/**
 * Reports whether a TS type node denotes a boolean type: the `boolean`
 * keyword, a boolean literal type, or a union composed entirely of those.
 * @param {BooleanTypeNode} typeNode - The TypeScript type node to inspect.
 * @returns {boolean} Whether the type node represents a boolean type.
 */
const isBooleanKeyword = (typeNode: BooleanTypeNode): boolean => {
  if (typeNode.type === "TSBooleanKeyword") {
    return true;
  }
  const { literal, types } = typeNode;
  if (literal) {
    return literal.type === "Literal" && isBoolean(literal.value);
  }
  if (types) {
    return types.every(isBooleanKeyword);
  }
  return false;
};

const booleanGetMethodNameRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const NO_PARAMETERS = 0;
    const check = (id: NamedNode): void => {
      context.report({ data: { name: id.name }, loc: id.loc, messageId: "rename" });
    };
    const checkParameterizedMethods = getBooleanOption(
      context.options,
      "checkParameterizedMethods",
      false,
    );
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      MethodDefinition(node) {
        if (node.kind !== "method" || node.key.type !== "Identifier") {
          return;
        }
        const {
          key: { name },
          value: { returnType },
        } = node;
        if (!GETTER_NAME.test(name)) {
          return;
        }
        if (!returnType || !isBooleanKeyword(returnType.typeAnnotation)) {
          return;
        }
        if (checkParameterizedMethods && node.value.params.length > NO_PARAMETERS) {
          return;
        }
        check(node.key);
      },
    };
  },
  meta: {
    docs: {
      description:
        "Require methods that return a boolean and are named getX() to be named isX() or hasX() instead.",
      url: "https://phpmd.org/rules/naming.html#booleangetmethodname",
    },
    messages: {
      rename:
        "The '{{name}}()' method which returns a boolean should be named 'is...()' or 'has...()'",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          checkParameterizedMethods: { type: "boolean" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { booleanGetMethodNameRule };
