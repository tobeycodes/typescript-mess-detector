import type { ESTree, Rule } from "@oxlint/plugins";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { getListOption } from "#utils/options.js";

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
      readonly data?: Readonly<Record<string, string>>;
      readonly loc: Readonly<NodeLocation>;
      readonly messageId: string;
    }>,
  ) => void;
}

/**
 * Ported from phpmd's `DevelopmentCodeFragment` rule (design.xml).
 * https://phpmd.org/rules/design.html#developmentcodefragment
 *
 * phpmd's default `unwanted-functions` list (`var_dump,print_r,debug_zval_dump,
 * debug_print_backtrace`) is PHP-specific and meaningless in JS/TS. This port keeps
 * the *mechanism* — a configurable, comma-separated `unwanted-functions` list checked
 * against call expressions — but changes the default to functions/statements that are
 * actually dev-only debugging aids in JS: `console.log`, `console.debug`, and the
 * `debugger` statement.
 *
 * `debugger` is a statement, not a call expression, so it can't be matched the same
 * way as the others. It's still driven by the same `unwanted-functions` option (so a
 * user can opt out of flagging it by omitting it from the list), but is detected via
 * a separate `DebuggerStatement` visitor.
 *
 * phpmd also has an `ignore-namespaces` boolean property that strips the current PHP
 * namespace prefix before comparing function images. PHP namespaces don't have a JS/TS
 * analogue (JS identifiers aren't namespace-qualified the way PHP's are), so that
 * option is intentionally not ported.
 */
const DEFAULT_UNWANTED_FUNCTIONS = "console.log,console.debug,debugger";

const EMPTY_NAME_LENGTH = 0;

const NO_CONFIGURED_FUNCTIONS = 0;

/**
 * Extracts a dotted callee name (e.g. `console.log`) from a call expression's callee.
 * @param {DeepReadonly<ESTree.Expression>} node - The callee expression to inspect.
 * @returns {string} The dotted name, or an empty string if the callee isn't a plain
 *   identifier or a non-computed member access chain rooted in one.
 */
const getCalleeName = (node: DeepReadonly<ESTree.Expression>): string => {
  let name = "";
  if (node.type === "Identifier") {
    ({ name } = node);
  } else if (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier"
  ) {
    const objectName = getCalleeName(node.object);
    const { name: propertyName } = node.property;
    name = propertyName;
    if (objectName.length > EMPTY_NAME_LENGTH) {
      name = `${objectName}.${propertyName}`;
    }
  }
  return name;
};

/**
 * Picks the effective `unwanted-functions` list: the configured list when non-empty,
 * otherwise the default.
 * @param {readonly string[]} configured - The list parsed from the rule's `unwanted-functions` option.
 * @returns {readonly string[]} The list of function names to treat as unwanted.
 */
const pickUnwantedFunctionNames = (configured: readonly string[]): readonly string[] => {
  if (configured.length > NO_CONFIGURED_FUNCTIONS) {
    return configured;
  }
  return DEFAULT_UNWANTED_FUNCTIONS.split(",");
};

const developmentCodeFragmentRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const configured = getListOption(context.options, "unwanted-functions");
    const unwantedFunctions = new Set(
      pickUnwantedFunctionNames(configured).map((entry) => entry.toLowerCase()),
    );
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      CallExpression(node) {
        const fragment = getCalleeName(node.callee);
        if (fragment.length === EMPTY_NAME_LENGTH) {
          return;
        }
        if (!unwantedFunctions.has(fragment.toLowerCase())) {
          return;
        }
        context.report({ data: { fragment }, loc: node.loc, messageId: "unwantedCall" });
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      DebuggerStatement(node) {
        if (!unwantedFunctions.has("debugger")) {
          return;
        }
        context.report({ loc: node.loc, messageId: "debuggerStatement" });
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow calling a configurable list of debug-only functions (default: console.log, console.debug) and using the debugger statement.",
      url: "https://phpmd.org/rules/design.html#developmentcodefragment",
    },
    messages: {
      debuggerStatement:
        "Avoid leaving 'debugger' statements in code; they are normally only used during development.",
      unwantedCall:
        "Avoid leaving the debug call '{{fragment}}()' in code; it is normally only used during development.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          "unwanted-functions": { type: "string" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { developmentCodeFragmentRule };
