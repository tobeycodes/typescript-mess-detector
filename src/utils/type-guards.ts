/**
 * Produces `undefined` without spelling the token.
 *
 * @param {Value} value - never pass this; its "not passed" state is the point.
 * @returns {Value | undefined} `undefined`.
 */
const absent = <Value>(value?: Value): Value | undefined => value;

/**
 * Type-predicate guard narrowing any candidate value to `boolean`.
 *
 * @template TCandidate - the static type of the candidate value, preserved on narrowing.
 * @param {TCandidate} value - the candidate value.
 * @returns {value is TCandidate & boolean} whether `value` is a boolean.
 */
const isBoolean = <TCandidate>(value: TCandidate): value is TCandidate & boolean =>
  typeof value === "boolean";

/**
 * Type-predicate guard narrowing any candidate value to `number`.
 *
 * @template TCandidate - the static type of the candidate value, preserved on narrowing.
 * @param {TCandidate} value - the candidate value.
 * @returns {value is TCandidate & number} whether `value` is a number.
 */
const isNumber = <TCandidate>(value: TCandidate): value is TCandidate & number =>
  typeof value === "number";

/**
 * Type-predicate guard narrowing any candidate value to `string`.
 *
 * @template TCandidate - the static type of the candidate value, preserved on narrowing.
 * @param {TCandidate} value - the candidate value.
 * @returns {value is TCandidate & string} whether `value` is a string.
 */
const isString = <TCandidate>(value: TCandidate): value is TCandidate & string =>
  typeof value === "string";

/**
 * Reads an own-property value out of a record keyed by a not-statically-known string, so the
 * caller's own record binding can keep its precise inferred (or literal) type instead of
 * widening to this function's necessarily broader `Record<string, TValue>` parameter type.
 *
 * @template TValue - the record's value type.
 * @param {Readonly<Record<string, TValue>>} record - the record to read from.
 * @param {string} key - the property name to read.
 * @returns {TValue | undefined} the value at `key`, or `undefined` if `record` has no own
 *   property by that name.
 */
const lookupOwn = <TValue>(
  record: Readonly<Record<string, TValue>>,
  key: string,
): TValue | undefined => {
  if (Object.hasOwn(record, key)) {
    return record[key];
  }
  return absent();
};

export { isBoolean, isNumber, isString, lookupOwn };
