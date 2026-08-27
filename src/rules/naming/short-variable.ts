import type { Context, ESTree, Rule } from "@oxlint/plugins";
import { FUNCTION_LIKE_TYPES, isForLoopInit } from "#utils/ast.js";
import { getListOption, getNumberOption } from "#utils/options.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";

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

type Settings = Readonly<{ exceptions: readonly string[]; minimum: number }>;

const DEFAULT_MINIMUM = 3;

const check = (context: DeepReadonly<Context>, target: NamedTarget, settings: Settings): void => {
  if (target.name.length >= settings.minimum) {
    return;
  }
  if (settings.exceptions.includes(target.name)) {
    return;
  }
  context.report({
    data: { minimum: settings.minimum, name: target.name },
    loc: target.loc,
    messageId: "tooShort",
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
  if (isForLoopInit(node)) {
    return;
  }
  check(context, node.id, settings);
};

/**
 * Ported from phpmd's `ShortVariable` rule (naming.xml).
 * https://phpmd.org/rules/naming.html#shortvariable
 */
const shortVariableRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const settings: Settings = {
      exceptions: getListOption(context.options, "exceptions"),
      minimum: getNumberOption(context.options, "minimum", DEFAULT_MINIMUM),
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
        "Disallow variable, parameter and field names shorter than a configured minimum length.",
      url: "https://phpmd.org/rules/naming.html#shortvariable",
    },
    messages: {
      tooShort:
        "Avoid variables with short names like '{{name}}'. Configured minimum length is {{minimum}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          exceptions: { type: "string" },
          minimum: { type: "number" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { shortVariableRule };
