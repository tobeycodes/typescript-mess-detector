import type { ESTree, Rule } from "@oxlint/plugins";
import { isNumber, isString } from "#utils/type-guards.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";

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
  readonly report: (
    diagnostic: Readonly<{
      readonly data: Readonly<{ readonly key: string; readonly line: number }>;
      readonly loc: Readonly<NodeLocation>;
      readonly messageId: string;
    }>,
  ) => void;
}

/** Property kinds ("init" | "get" | "set") already accounted for under a given key. */
interface SeenKey {
  kinds: Set<ESTree.ObjectProperty["kind"]>;
  line: number;
}

interface NormalizedKey {
  readonly key: string;
  readonly resolved: boolean;
}

interface PropertyOutcome {
  readonly key: string;
  readonly line: number;
  readonly shouldReport: boolean;
}

/** Read-only view of {@link SeenKey}, with `kinds` itself also readonly. */
interface SeenKeyView {
  readonly kinds: Readonly<Set<ESTree.ObjectProperty["kind"]>>;
  readonly line: number;
}

/** Sentinel "nothing to report" outcome for per-property processing. */
const NO_OUTCOME: Readonly<PropertyOutcome> = { key: "", line: 0, shouldReport: false };

/** The number of accessor kinds recorded once a `get`/`set` pair has been paired up. */
const SINGLE_KIND_COUNT = 1;

/** Sentinel for a key that couldn't be resolved statically — see {@link normalizeKey}. */
const UNRESOLVED_KEY: Readonly<NormalizedKey> = { key: "", resolved: false };

/**
 * Whether `property` is the complementary half (`set` when only `get` was seen, or vice versa)
 * of an accessor pair already recorded as `existing` — the one JS-specific case that is a second
 * declaration of the same key without being a duplicate/override.
 * @param {DeepReadonly<ESTree.ObjectProperty>} property - The property currently being visited.
 * @param {Readonly<SeenKeyView>} existing - The previously-seen entry for this key.
 * @returns {boolean} Whether `property` completes an accessor pair rather than duplicating it.
 */
const isComplementaryAccessor = (
  property: DeepReadonly<ESTree.ObjectProperty>,
  existing: Readonly<SeenKeyView>,
): boolean =>
  (property.kind === "get" || property.kind === "set") &&
  existing.kinds.size === SINGLE_KIND_COUNT &&
  !existing.kinds.has(property.kind) &&
  (existing.kinds.has("get") || existing.kinds.has("set"));

/**
 * Normalizes a non-computed object property key to the string value JS actually uses to look it
 * up at runtime (`ToPropertyKey`). Unlike phpmd's PHP-array analog — which special-cases `false`,
 * `true`, and `null` keys because PHP coerces array keys through its own scalar rules — plain JS
 * object keys are always just strings (numeric literal keys are stringified, and `true`/`false`/
 * `null` used as bare keys are parsed as `Identifier` names, not boolean/null literals, so they
 * already normalize correctly via the `Identifier` branch below). Expressions, computed keys,
 * and non-string/number literals can't be resolved statically and are skipped, mirroring phpmd's
 * treatment of "expressions, method calls, globals, constants".
 * @param {DeepReadonly<ESTree.PropertyKey>} key - The property's key node.
 * @returns {Readonly<NormalizedKey>} The normalized key, or {@link UNRESOLVED_KEY}.
 */
const normalizeKey = (key: DeepReadonly<ESTree.PropertyKey>): Readonly<NormalizedKey> => {
  if (key.type === "Identifier") {
    return { key: key.name, resolved: true };
  }
  if (key.type === "Literal") {
    if (isString(key.value)) {
      return { key: key.value, resolved: true };
    }
    if (isNumber(key.value)) {
      return { key: String(key.value), resolved: true };
    }
  }
  return UNRESOLVED_KEY;
};

/**
 * Ported from phpmd's `DuplicatedArrayKey` rule (cleancode.xml), adapted to JS object literals.
 * https://phpmd.org/rules/cleancode.html#duplicatedarraykey
 *
 * One JS-specific wrinkle with no PHP array analog: a `get x() {}`/`set x() {}` pair sharing a
 * name is a single accessor property, not a duplicate/override, so that exact pairing is
 * exempted. Any other repeat of a key (same kind again, or mixing an accessor with a plain value)
 * does silently override the earlier entry and is reported.
 *
 * Also note: phpmd's own implementation reports the *current* duplicate's line number in the
 * "first declared at line {1}" slot (a `$arrayElement` reuse that looks like an upstream bug).
 * This port reports what the message text actually promises: the line of the original,
 * first-declared occurrence.
 */
const duplicatedArrayKeyRule: Rule = {
  create(context: Readonly<RuleContext>) {
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the oxlint plugin API's VisitorObject type requires this parameter to accept the full mutable Node union via its catch-all index signature; no readonly-narrowed type is assignable
      ObjectExpression(node) {
        const seen = new Map<string, SeenKey>();
        // oxlint-disable-next-line eslint/max-statements -- splitting the `normalized`/`priorEntry` declarations into separate statements (required by `eslint/one-var`) pushes this one over the limit; the logic itself is no more complex than before.
        const visitProperty = (
          property: DeepReadonly<ESTree.ObjectProperty>,
        ): Readonly<PropertyOutcome> => {
          const normalized = normalizeKey(property.key);
          const priorEntry = seen.get(normalized.key);
          if (!normalized.resolved) {
            return NO_OUTCOME;
          }
          if (!priorEntry) {
            seen.set(normalized.key, {
              kinds: new Set([property.kind]),
              line: property.loc.start.line,
            });
            return NO_OUTCOME;
          }
          if (isComplementaryAccessor(property, priorEntry)) {
            priorEntry.kinds.add(property.kind);
            return NO_OUTCOME;
          }
          return { key: normalized.key, line: priorEntry.line, shouldReport: true };
        };
        for (const property of node.properties) {
          if (property.type === "Property" && !property.computed) {
            const outcome = visitProperty(property);
            if (outcome.shouldReport) {
              context.report({
                data: { key: outcome.key, line: outcome.line },
                loc: property.loc,
                messageId: "duplicatedKey",
              });
            }
          }
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow duplicate keys in an object literal, where a later duplicate silently overrides an earlier one.",
      url: "https://phpmd.org/rules/cleancode.html#duplicatedarraykey",
    },
    messages: {
      duplicatedKey: "Duplicated array key '{{key}}', first declared at line {{line}}.",
    },
    schema: [],
    type: "suggestion",
  },
};

export { duplicatedArrayKeyRule };
