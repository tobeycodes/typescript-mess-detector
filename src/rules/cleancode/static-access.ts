import type { ESTree, Rule } from "@oxlint/plugins";
import { getEnclosingFunction, getFunctionName } from "#utils/function-context.js";
import { getListOption, getStringOption } from "#utils/options.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { isPascalCase } from "#utils/casing.js";
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
      readonly data: Readonly<{ readonly className: string; readonly method: string }>;
      readonly loc: Readonly<NodeLocation>;
      readonly messageId: string;
    }>,
  ) => void;
}

interface ExceptionConfig {
  readonly exactSet: Readonly<Set<string>>;
  readonly ignoreRegExp: Readonly<RegExp>;
  readonly wildcardSet: readonly Readonly<RegExp>[];
}

/** The report payload for a flagged (or not-flagged) static access. */
interface StaticAccessResult {
  readonly className: string;
  readonly method: string;
}

/** A regex that can never match any string — see {@link buildIgnoreRegExp}. */
const NEVER_MATCHES = /(?!)/u;

/**
 * Sentinel "no violation" result for {@link resolveStaticAccess}. An empty `className` (never a
 * valid identifier) signals "not a static access".
 */
const NO_STATIC_ACCESS = { className: "", method: "" };

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
 * Converts a wildcard `exceptions` entry (`*` meaning "any characters") into a regex.
 * @param {string} pattern - The raw wildcard pattern, e.g. `Foo*`.
 * @returns {RegExp} The equivalent anchored regex.
 */
const buildWildcardRegExp = (pattern: string): RegExp => {
  const escaped = pattern.replaceAll(/[.+?^${}()|[\]\\]/gu, String.raw`\$&`).replaceAll("*", ".*");
  return new RegExp(`^${escaped}$`, "u");
};

/**
 * Whether `className` is covered by the `exceptions` option, either as an exact match or a
 * wildcard match.
 * @param {string} className - The class name found at the call site.
 * @param {Readonly<Set<string>>} exactSet - Exact `exceptions` class names to skip.
 * @param {readonly Readonly<RegExp>[]} wildcardSet - Wildcard `exceptions` patterns to skip.
 * @returns {boolean} Whether `className` is excepted.
 */
const isExcepted = (
  className: string,
  exactSet: Readonly<Set<string>>,
  wildcardSet: readonly Readonly<RegExp>[],
): boolean => {
  if (exactSet.has(className)) {
    return true;
  }
  return wildcardSet.some((regExp) => regExp.test(className));
};

/**
 * Resolves the reported `{className, method}` payload for a call's `callee`, or
 * {@link NO_STATIC_ACCESS} when the call isn't a flagged static access.
 * @param {DeepReadonly<ESTree.Expression>} callee - The call's callee expression.
 * @param {string | undefined} methodName - The name of the method enclosing the call, if any.
 * @param {Readonly<ExceptionConfig>} exceptionConfig - The resolved `exceptions`/`ignorepattern` options.
 * @returns {Readonly<StaticAccessResult>} The report payload, or {@link NO_STATIC_ACCESS}.
 */
const resolveStaticAccess = (
  callee: DeepReadonly<ESTree.Expression>,
  methodName: string | undefined,
  exceptionConfig: Readonly<ExceptionConfig>,
): Readonly<StaticAccessResult> => {
  if (callee.type !== "MemberExpression" || callee.computed) {
    return NO_STATIC_ACCESS;
  }
  if (callee.object.type !== "Identifier") {
    return NO_STATIC_ACCESS;
  }
  const className = callee.object.name;
  if (
    !isPascalCase(className) ||
    isExcepted(className, exceptionConfig.exactSet, exceptionConfig.wildcardSet)
  ) {
    return NO_STATIC_ACCESS;
  }
  if (isString(methodName) && exceptionConfig.ignoreRegExp.test(methodName)) {
    return NO_STATIC_ACCESS;
  }
  return { className, method: methodName ?? "(anonymous)" };
};

/**
 * Ported from phpmd's `StaticAccess` rule (cleancode.xml).
 * https://phpmd.org/rules/cleancode.html#staticaccess
 *
 * phpmd can tell `Foo::bar()` is a static call directly from PHP syntax. Oxlint's plugin API has
 * no type information, so there is no reliable way to know whether `Foo.bar()` calls a static
 * class method or is just a method call on an object stored in a PascalCase-named variable (e.g.
 * a factory result assigned to `const Model = ...`). This port uses a pragmatic heuristic
 * instead: flag a non-computed member-call whose object is a bare `Identifier` written in
 * PascalCase (and is therefore conventionally a class reference, not an instance). This will
 * produce false positives for PascalCase-named non-class variables, and false negatives for
 * static calls reached through a lowercase alias (e.g. `const svc = Foo; svc.bar()`) — both are
 * inherent limitations of a syntax-only check and are called out here and in the final report.
 */
const staticAccessRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const entries = getListOption(context.options, "exceptions");
    const exceptionConfig: ExceptionConfig = {
      exactSet: new Set(entries.filter((entry) => !entry.includes("*"))),
      ignoreRegExp: buildIgnoreRegExp(getStringOption(context.options, "ignorepattern", "").trim()),
      wildcardSet: entries
        .filter((entry) => entry.includes("*"))
        .map((entry) => buildWildcardRegExp(entry)),
    };
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      CallExpression(node) {
        const enclosingFunction = getEnclosingFunction(node);
        const methodName = enclosingFunction && getFunctionName(enclosingFunction);
        const result = resolveStaticAccess(node.callee, methodName, exceptionConfig);
        if (!result.className) {
          return;
        }
        context.report({ data: result, loc: node.loc, messageId: "staticAccess" });
      },
    };
  },
  meta: {
    docs: {
      description:
        "Discourage calling a method directly on a PascalCase-named identifier, a likely static class method call that creates a hard dependency on that class.",
      url: "https://phpmd.org/rules/cleancode.html#staticaccess",
    },
    messages: {
      staticAccess: "Avoid using static access to class '{{className}}' in method '{{method}}'.",
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

export { staticAccessRule };
