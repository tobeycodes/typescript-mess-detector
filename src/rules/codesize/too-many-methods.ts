import type { Context, ESTree, Rule } from "@oxlint/plugins";
import { getNumberOption, getStringOption } from "#utils/options.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { bareName } from "#utils/names.js";
import { parsePhpPcrePattern } from "#utils/phpmd-regex.js";

/* Structural minimum every AST node satisfies. */
interface SpanLike {
  readonly type: string;
  readonly loc: {
    readonly start: { readonly line: number; readonly column: number };
    readonly end: { readonly line: number; readonly column: number };
  };
}

const DEFAULT_IGNORE_PATTERN = "(^(set|get|is|has|with))i";

/* A regex that never matches anything, used as the "no ignore pattern configured" sentinel. */
const NEVER_MATCHES = /(?!)/u;

const isClassNode = (node: SpanLike): node is DeepReadonly<ESTree.Class> => "body" in node;

const isIgnored = (pattern: Readonly<RegExp>, name: string): boolean => pattern.test(name);

const methodName = (member: DeepReadonly<ESTree.MethodDefinition>): string => {
  if (member.kind === "constructor") {
    return "constructor";
  }
  if (member.computed) {
    return "";
  }
  if (member.key.type === "Identifier") {
    return member.key.name;
  }
  if (member.key.type === "PrivateIdentifier") {
    return bareName(member.key.name);
  }
  return "";
};

const nonAccessorMethodCount = (
  members: readonly DeepReadonly<ESTree.ClassElement>[],
  ignorePattern: Readonly<RegExp>,
): number => {
  const INCREMENT = 1;
  let count = 0;
  for (const member of members) {
    if (member.type === "MethodDefinition" && member.kind !== "get" && member.kind !== "set") {
      const name = methodName(member);
      if (name !== "" && !isIgnored(ignorePattern, name)) {
        count += INCREMENT;
      }
    }
  }
  return count;
};

/**
 * Ported from phpmd's `TooManyMethods` rule (codesize.xml).
 * https://phpmd.org/rules/codesize.html#toomanymethods
 *
 * Only `ClassDeclaration` is checked — the PHP rule is `ClassAware` only.
 * Getters/setters written with PHP naming convention (`getFoo`/`setFoo`) are
 * excluded via `ignorepattern`; JS/TS's native `get`/`set` accessor syntax
 * doesn't prefix the property name the same way (a `get foo()` accessor's
 * name is `foo`, not `getFoo`), so it would never match the pattern. To keep
 * the spirit of "don't penalize getters/setters", accessor methods (kind
 * `get`/`set`) are always excluded here regardless of name, in addition to
 * applying `ignorepattern` to everything else.
 */
const tooManyMethodsRule: Rule = {
  create(context: DeepReadonly<Context>) {
    const DEFAULT_MAXMETHODS = 25;
    const ignorePatternSource = getStringOption(
      context.options,
      "ignorepattern",
      DEFAULT_IGNORE_PATTERN,
    );
    const maxmethods = getNumberOption(context.options, "maxmethods", DEFAULT_MAXMETHODS);
    let ignorePattern: Readonly<RegExp> = NEVER_MATCHES;
    if (ignorePatternSource) {
      ignorePattern = parsePhpPcrePattern(ignorePatternSource);
    }
    return {
      ClassDeclaration(node: SpanLike) {
        if (!isClassNode(node)) {
          return;
        }
        const count = nonAccessorMethodCount(node.body.body, ignorePattern);
        if (count <= maxmethods) {
          return;
        }
        let name = "anonymous";
        if (node.id) {
          ({ name } = node.id);
        }
        context.report({
          data: { count, maxmethods, name },
          loc: node.loc,
          messageId: "tooManyMethods",
        });
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow classes with more non-getter/setter methods than a configured maximum.",
      url: "https://phpmd.org/rules/codesize.html#toomanymethods",
    },
    messages: {
      tooManyMethods:
        "The class {{name}} has {{count}} non-getter- and setter-methods. Consider refactoring {{name}} to keep number of methods under {{maxmethods}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          ignorepattern: { type: "string" },
          maxmethods: { type: "number" },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { tooManyMethodsRule };
