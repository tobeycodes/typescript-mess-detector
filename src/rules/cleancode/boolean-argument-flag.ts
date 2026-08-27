import type { ESTree, Rule } from "@oxlint/plugins";
import { getEnclosingClassName, getFunctionName } from "#utils/function-context.js";
import { getListOption, getStringOption } from "#utils/options.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { FUNCTION_LIKE_TYPES } from "#utils/ast.js";
import { isString } from "#utils/type-guards.js";

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
      readonly data: Readonly<{ readonly name: string; readonly param: string }>;
      readonly loc: Readonly<NodeLocation>;
      readonly messageId: string;
    }>,
  ) => void;
}

interface FlagCheckConfig {
  readonly exceptions: Readonly<Set<string>>;
  readonly ignoreRegExp: Readonly<RegExp>;
}

/** Minimal shape shared by every ESTree node: enough to drive generic, type-safe narrowing. */
// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- see the identical, explained `NodeLike` in `#utils/ast-walk.js`: every ESTree node's non-`type` field varies per node kind, and this module's own doc comment above explains why it duck-types via a plain, index-signature type rather than `@oxlint/plugins`'s real (non-readonly-safe) `ESTree.*` types.
type NodeLike = Readonly<Record<string, unknown>> & { readonly type: string };

/**
 * A regex that can never match any string. Used instead of `undefined` for "no `ignorepattern`
 * configured".
 */
const NEVER_MATCHES = /(?!)/u;

/**
 * Builds the `ignorepattern` regex up front, or {@link NEVER_MATCHES} when unconfigured.
 * @param {string} ignorePattern - The raw `ignorepattern` option value, already trimmed.
 * @returns {RegExp} The compiled, case-sensitive regex, or `NEVER_MATCHES` when unconfigured.
 */
const buildIgnoreRegExp = (ignorePattern: string): RegExp => {
  if (ignorePattern) {
    return new RegExp(ignorePattern, "u");
  }
  return NEVER_MATCHES;
};

/**
 * Duck-types `value` as an ESTree node: enough to drive narrowing.
 * @template TCandidate - The static type of the candidate value, preserved on narrowing.
 * @param {TCandidate} value - The candidate value.
 * @returns {value is TCandidate & NodeLike} Whether `value` looks like an ESTree node.
 */
const isAstNode = <TCandidate>(value: TCandidate): value is TCandidate & NodeLike =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";

/**
 * Whether `value` is a boolean literal node (`true`/`false`).
 * @template TCandidate - The static type of the candidate value, preserved on narrowing.
 * @param {TCandidate} value - The candidate node.
 * @returns {value is TCandidate & NodeLike & { readonly value: boolean }} Whether `value` is a
 *   boolean literal.
 */
const isBooleanLiteral = <TCandidate>(
  value: TCandidate,
): value is TCandidate & NodeLike & { readonly value: boolean } =>
  isAstNode(value) && value.type === "Literal" && typeof value["value"] === "boolean";

/**
 * Recognizes `boolean`, `true`/`false` literal types, and unions of those (e.g. `true | false`).
 * @template TCandidate - The static type of the candidate value, preserved on narrowing.
 * @param {TCandidate} value - The candidate type-annotation node.
 * @returns {value is TCandidate & NodeLike} Whether `value` denotes a boolean (or
 *   boolean-literal-union) type.
 */
const isBooleanTypeAnnotation = <TCandidate>(value: TCandidate): value is TCandidate & NodeLike => {
  if (!isAstNode(value)) {
    return false;
  }
  if (value.type === "TSBooleanKeyword") {
    return true;
  }
  if (value.type === "TSLiteralType" && isAstNode(value["literal"])) {
    return value["literal"].type === "Literal" && typeof value["literal"]["value"] === "boolean";
  }
  if (value.type === "TSUnionType" && Array.isArray(value["types"])) {
    return value["types"].every((member) => isBooleanTypeAnnotation(member));
  }
  return false;
};

/**
 * @param {DeepReadonly<ESTree.Node>} value - The candidate parameter-target node.
 * @returns {string} `value`'s identifier name, or a generic fallback.
 */
const paramDisplayName = (value: DeepReadonly<ESTree.Node>): string => {
  if (isAstNode(value) && value.type === "Identifier" && isString(value.name)) {
    return value.name;
  }
  return "parameter";
};

/**
 * Reports `param` if it's a boolean flag: either a boolean-literal default value, or (a
 * TypeScript-only extension of phpmd's original check) an explicit `boolean` type annotation.
 * @param {DeepReadonly<ESTree.ParamPattern>} param - The parameter to check.
 * @param {string} displayName - The enclosing function/method's display name.
 * @param {Readonly<RuleContext>} context - The rule context to report through.
 * @returns {void} Nothing.
 */
const processParam = (
  param: DeepReadonly<ESTree.ParamPattern>,
  displayName: string,
  context: Readonly<RuleContext>,
): void => {
  let target: DeepReadonly<ESTree.Node> = param;
  if (param.type === "AssignmentPattern") {
    target = param.left;
  }
  if (param.type === "AssignmentPattern" && isBooleanLiteral(param.right)) {
    context.report({
      data: { name: displayName, param: paramDisplayName(target) },
      loc: param.loc,
      messageId: "booleanFlag",
    });
  } else if (
    target.type === "Identifier" &&
    target.typeAnnotation &&
    isBooleanTypeAnnotation(target.typeAnnotation.typeAnnotation)
  ) {
    context.report({
      data: { name: displayName, param: target.name },
      loc: param.loc,
      messageId: "booleanFlag",
    });
  }
};

/**
 * Whether a function named `name`, enclosed by class `className`, should be skipped entirely —
 * either because it matches the configured `ignorepattern`, or because its enclosing class is
 * in the `exceptions` list.
 * @param {string | undefined} name - The function/method's resolved name, if any.
 * @param {string | undefined} className - The name of the enclosing class, if any.
 * @param {Readonly<FlagCheckConfig>} config - The resolved `exceptions`/`ignorepattern` options.
 * @returns {boolean} Whether to skip this function entirely.
 */
const shouldSkipFunction = (
  name: string | undefined,
  className: string | undefined,
  config: Readonly<FlagCheckConfig>,
): boolean => {
  if (isString(name) && config.ignoreRegExp.test(name)) {
    return true;
  }
  return isString(className) && config.exceptions.has(className);
};

/**
 * Ported from phpmd's `BooleanArgumentFlag` rule (cleancode.xml).
 * https://phpmd.org/rules/cleancode.html#booleanargumentflag
 *
 * phpmd can only detect a boolean flag through a literal `true`/`false` default value, since
 * that's the only boolean signal syntactically available in PHP without full type inference.
 * TypeScript has an additional, arguably stronger signal: a parameter explicitly typed `boolean`
 * (with no default) is just as much a hidden-branching-logic smell as a boolean-defaulted one.
 * This port intentionally extends detection to cover that case too — see the report for details.
 */
const booleanArgumentFlagRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const flagCheckConfig: FlagCheckConfig = {
      exceptions: new Set(getListOption(context.options, "exceptions")),
      ignoreRegExp: buildIgnoreRegExp(getStringOption(context.options, "ignorepattern", "").trim()),
    };
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
    const visitFunction = (node: ESTree.Function): void => {
      const className = getEnclosingClassName(node);
      const name = getFunctionName(node);
      const resolvedName = name ?? "(anonymous)";
      if (shouldSkipFunction(name, className, flagCheckConfig)) {
        return;
      }
      for (const param of node.params) {
        processParam(param, resolvedName, context);
      }
    };
    return Object.fromEntries(FUNCTION_LIKE_TYPES.map((type) => [type, visitFunction]));
  },
  meta: {
    docs: {
      description:
        "Disallow boolean flag parameters, which are a common sign of hidden branching logic (SRP violation).",
      url: "https://phpmd.org/rules/cleancode.html#booleanargumentflag",
    },
    messages: {
      booleanFlag:
        "The function/method '{{name}}' has a boolean flag argument '{{param}}', which is a certain sign of a Single Responsibility Principle violation.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          exceptions: { type: "string" },
          ignorepattern: { type: "string" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { booleanArgumentFlagRule };
