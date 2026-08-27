import type { Context, ESTree, Rule } from "@oxlint/plugins";
import { getListOption, getNumberOption } from "#utils/options.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { FUNCTION_LIKE_TYPES } from "#utils/ast.js";
import { lengthWithoutPrefixesAndSuffixes } from "#utils/names.js";

interface LineColumn {
  readonly column: number;
  readonly line: number;
}

interface NodeLocation {
  readonly end: Readonly<LineColumn>;
  readonly start: Readonly<LineColumn>;
}

/** A name-bearing node plus the name itself. */
type NamedTarget = Readonly<{ loc: Readonly<NodeLocation>; name: string }>;

type Settings = Readonly<{
  maximum: number;
  prefixes: readonly string[];
  suffixes: readonly string[];
}>;

const DEFAULT_MAXIMUM = 20;

const check = (context: DeepReadonly<Context>, target: NamedTarget, settings: Settings): void => {
  const { length } = lengthWithoutPrefixesAndSuffixes(
    target.name,
    settings.prefixes,
    settings.suffixes,
  );
  if (length <= settings.maximum) {
    return;
  }
  context.report({
    data: { maximum: settings.maximum, name: target.name },
    loc: target.loc,
    messageId: "tooLong",
  });
};

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node the visitor callback is given; no readonly type is assignable here.
const checkFunctionParams = (
  context: DeepReadonly<Context>,
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node the visitor callback is given; no readonly type is assignable here.
  node: ESTree.Function,
  settings: Settings,
): void => {
  for (const param of node.params) {
    if (param.type === "AssignmentPattern") {
      if (param.left.type === "Identifier") {
        check(context, param.left, settings);
      }
    } else if (param.type === "Identifier") {
      check(context, param, settings);
    }
  }
};

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node the visitor callback is given; no readonly type is assignable here.
const checkPropertyDefinition = (
  context: DeepReadonly<Context>,
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node the visitor callback is given; no readonly type is assignable here.
  node: ESTree.PropertyDefinition,
  settings: Settings,
): void => {
  if (node.key.type !== "Identifier" || node.computed) {
    return;
  }
  check(context, node.key, settings);
};

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node the visitor callback is given; no readonly type is assignable here.
const checkVariableDeclarator = (
  context: DeepReadonly<Context>,
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node the visitor callback is given; no readonly type is assignable here.
  node: ESTree.VariableDeclarator,
  settings: Settings,
): void => {
  if (node.id.type !== "Identifier") {
    return;
  }
  check(context, node.id, settings);
};

/**
 * Ported from phpmd's `LongVariable` rule (naming.xml).
 * https://phpmd.org/rules/naming.html#longvariable
 */
const longVariableRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const settings: Settings = {
      maximum: getNumberOption(context.options, "maximum", DEFAULT_MAXIMUM),
      prefixes: getListOption(context.options, "subtract-prefixes"),
      suffixes: getListOption(context.options, "subtract-suffixes"),
    };
    return Object.assign(
      Object.fromEntries(
        FUNCTION_LIKE_TYPES.map((type) => [
          type,
          // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node the visitor callback is given; no readonly type is assignable here.
          (node: ESTree.Function) => {
            checkFunctionParams(context, node, settings);
          },
        ]),
      ),
      {
        // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node the visitor callback is given; no readonly type is assignable here.
        PropertyDefinition: (node: ESTree.PropertyDefinition) => {
          checkPropertyDefinition(context, node, settings);
        },
        // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node the visitor callback is given; no readonly type is assignable here.
        VariableDeclarator: (node: ESTree.VariableDeclarator) => {
          checkVariableDeclarator(context, node, settings);
        },
      },
    );
  },
  meta: {
    docs: {
      description:
        "Disallow variable, parameter and field names longer than a configured maximum length.",
      url: "https://phpmd.org/rules/naming.html#longvariable",
    },
    messages: {
      tooLong:
        "Avoid excessively long variable names like '{{name}}'. Keep variable name length under {{maximum}}.",
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

export { longVariableRule };
