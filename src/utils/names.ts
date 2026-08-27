import { isString } from "./type-guards.js";

const HASH_SIGIL_LENGTH = 1;

const MIN_AFFIX_LENGTH = 0;

const SLICE_START = 0;

/**
 * Strips a leading `#` from private class field/method names so length checks match phpmd's
 * un-sigiled names.
 *
 * @param {string} name - the raw identifier, possibly `#`-prefixed.
 * @returns {string} `name` without its leading `#`, if it had one.
 */
const bareName = (name: string): string => {
  if (name.startsWith("#")) {
    return name.slice(HASH_SIGIL_LENGTH);
  }
  return name;
};

/**
 * Mirrors phpmd's `Strings::lengthWithoutPrefixesAndSuffixes` used by Long/ShortClassName and LongVariable.
 *
 * @param {string} name - the identifier to strip.
 * @param {readonly string[]} prefixes - candidate prefixes to strip, longest-match-first is not
 *   applied — the first configured prefix that matches wins, mirroring phpmd's own behavior.
 * @param {readonly string[]} suffixes - candidate suffixes to strip, same matching rule.
 * @returns {string} `name` with the first matching prefix and suffix removed.
 */
const lengthWithoutPrefixesAndSuffixes = (
  name: string,
  prefixes: readonly string[],
  suffixes: readonly string[],
): string => {
  let result = name;
  {
    const prefix = prefixes.find(
      (candidate) => candidate.length > MIN_AFFIX_LENGTH && result.startsWith(candidate),
    );
    if (isString(prefix)) {
      result = result.slice(prefix.length);
    }
  }
  {
    const suffix = suffixes.find(
      (candidate) => candidate.length > MIN_AFFIX_LENGTH && result.endsWith(candidate),
    );
    if (isString(suffix)) {
      result = result.slice(SLICE_START, result.length - suffix.length);
    }
  }
  return result;
};

export { bareName, lengthWithoutPrefixesAndSuffixes };
