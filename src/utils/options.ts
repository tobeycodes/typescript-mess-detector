import { isBoolean, isNumber, isString } from "./type-guards.js";

// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- an oxlint rule's `options` bag is arbitrary, rule-author-defined JSON with no fixed schema to derive a value type from; each accessor below (`getBooleanOption`, `getStringOption`, ...) is the actual boundary parser that decodes one property into a concrete domain type.
type RuleOptions = Readonly<Record<string, unknown>>;

const EMPTY_OPTIONS: RuleOptions = Object.freeze({});

const EMPTY_STRING = "";

const FIRST_OPTION_INDEX = 0;

const MIN_ENTRY_LENGTH = 0;

/**
 * Type-predicate guard treating any non-null object as a valid {@link RuleOptions} bag — sound
 * in practice since indexing a plain JS object with an arbitrary string key that isn't present
 * simply yields `undefined`, which is assignable to `unknown`.
 *
 * @template TCandidate - the static type of the candidate value, preserved on narrowing.
 * @param {TCandidate} value - the candidate options bag.
 * @returns {value is TCandidate & RuleOptions} whether `value` is a non-null object.
 */
const checkOptionsBag = <TCandidate>(value: TCandidate): value is TCandidate & RuleOptions =>
  typeof value === "object" && value !== null;

/**
 * Picks out the first entry of an oxlint rule's `options` array — the object bag holding every
 * rule property (e.g. `{ exceptions: "..." }`) — falling back to an empty object when the rule
 * was configured with no options at all, or a non-object first entry.
 *
 * @param {readonly unknown[] | undefined} options - the rule's raw `context.options`.
 * @returns {RuleOptions} the first options object, or an empty one.
 */
const firstOption = (options: readonly unknown[] | undefined): RuleOptions => {
  if (!Array.isArray(options)) {
    return EMPTY_OPTIONS;
  }
  const first: unknown = options[FIRST_OPTION_INDEX];
  if (checkOptionsBag(first)) {
    return first;
  }
  return EMPTY_OPTIONS;
};

/**
 * Reads a boolean-valued property from a rule's first options object.
 *
 * @param {readonly unknown[] | undefined} options - the rule's raw `context.options`.
 * @param {string} key - the property name to read.
 * @param {boolean} fallback - the value to use when the property is absent or not a boolean.
 * @returns {boolean} the resolved option value.
 */
const getBooleanOption = (
  options: readonly unknown[] | undefined,
  key: string,
  fallback: boolean,
): boolean => {
  const value = firstOption(options)[key];
  if (isBoolean(value)) {
    return value;
  }
  return fallback;
};

/**
 * Mirrors phpmd's comma-separated string properties (e.g. `exceptions`, `subtract-prefixes`).
 *
 * @param {readonly unknown[] | undefined} options - the rule's raw `context.options`.
 * @param {string} key - the property name to read.
 * @returns {string[]} the trimmed, non-empty comma-separated entries.
 */
const getListOption = (options: readonly unknown[] | undefined, key: string): string[] => {
  const value = firstOption(options)[key];
  let source = EMPTY_STRING;
  if (isString(value)) {
    source = value;
  }
  return source
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > MIN_ENTRY_LENGTH);
};

/**
 * Reads a number-valued property from a rule's first options object.
 *
 * @param {readonly unknown[] | undefined} options - the rule's raw `context.options`.
 * @param {string} key - the property name to read.
 * @param {number} fallback - the value to use when the property is absent or not a number.
 * @returns {number} the resolved option value.
 */
const getNumberOption = (
  options: readonly unknown[] | undefined,
  key: string,
  fallback: number,
): number => {
  const value = firstOption(options)[key];
  if (isNumber(value)) {
    return value;
  }
  return fallback;
};

/**
 * Reads a string-valued property from a rule's first options object.
 *
 * @param {readonly unknown[] | undefined} options - the rule's raw `context.options`.
 * @param {string} key - the property name to read.
 * @param {string} fallback - the value to use when the property is absent or not a string.
 * @returns {string} the resolved option value.
 */
const getStringOption = (
  options: readonly unknown[] | undefined,
  key: string,
  fallback: string,
): string => {
  const value = firstOption(options)[key];
  if (isString(value)) {
    return value;
  }
  return fallback;
};

export { getBooleanOption, getListOption, getNumberOption, getStringOption };
