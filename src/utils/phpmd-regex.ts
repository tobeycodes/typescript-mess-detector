import { isString, lookupOwn } from "./type-guards.js";

/** Result of splitting a delimited PCRE pattern string into its regex body and JS flags. */
interface DelimitedPattern {
  readonly body: string;
  readonly flags: string;
}

const BASE_FLAGS = "u";

const BODY_START = 1;

const CLOSING_FOR = { "(": ")", "<": ">", "[": "]", "{": "}" };

const DELIMITER_NOT_FOUND = 0;

const MIN_DELIMITED_PATTERN_LENGTH = 2;

const MODIFIER_LETTERS = ["i", "m", "s", "u"] as const;

const MODIFIER_START_OFFSET = 1;

const OPENING_DELIMITER_INDEX = 0;

/**
 * Resolves the closing delimiter that pairs with a PCRE pattern's opening delimiter: the four
 * bracket pairs have a distinct closing character, while every other delimiter (`#`, `~`, `/`,
 * ...) is used unchanged as its own closing character.
 *
 * @param {string} open - the opening delimiter character.
 * @returns {string} the matching closing delimiter character.
 */
const closingDelimiterFor = (open: string): string => {
  const closing = lookupOwn(CLOSING_FOR, open);
  if (isString(closing)) {
    return closing;
  }
  return open;
};

/**
 * Reads the recognized PCRE modifier letters (`i`, `m`, `s`, `u`) present in the modifier
 * suffix, translating them one-for-one into JS `RegExp` flags of the same letter. Always
 * includes JS's own `u` (unicode) flag regardless of the source pattern, since `RegExp`
 * literals in this codebase are required to opt into it; the `Set` also protects against
 * ever emitting a duplicate `u` flag (which throws at `RegExp` construction) when the source
 * pattern already requested PCRE's own `u` modifier.
 *
 * @param {string} pcreModifiers - the raw modifier suffix following the closing delimiter.
 * @returns {string} the equivalent JS `RegExp` flags string.
 */
const extractFlags = (pcreModifiers: string): string => {
  const modifierSet = new Set(pcreModifiers + BASE_FLAGS);
  let flags = "";
  for (const letter of MODIFIER_LETTERS) {
    if (modifierSet.has(letter)) {
      flags += letter;
    }
  }
  return flags;
};

/**
 * Splits a delimited PCRE pattern string (`(pattern)i`, `#pattern#`, ...) into its regex body
 * and equivalent JS flags, falling back to treating the whole trimmed string as an
 * undelimited body when it doesn't look properly delimited.
 *
 * @param {string} trimmed - the trimmed raw pattern string.
 * @returns {DelimitedPattern} the resolved body and flags.
 */
const matchDelimiters = (trimmed: string): DelimitedPattern => {
  if (trimmed.length < MIN_DELIMITED_PATTERN_LENGTH) {
    return { body: trimmed, flags: BASE_FLAGS };
  }
  const openCandidate = trimmed[OPENING_DELIMITER_INDEX];
  if (!isString(openCandidate)) {
    return { body: trimmed, flags: BASE_FLAGS };
  }
  const close = closingDelimiterFor(openCandidate);
  const lastClose = trimmed.lastIndexOf(close);
  if (lastClose <= DELIMITER_NOT_FOUND) {
    return { body: trimmed, flags: BASE_FLAGS };
  }
  return {
    body: trimmed.slice(BODY_START, lastClose),
    flags: extractFlags(trimmed.slice(lastClose + MODIFIER_START_OFFSET)),
  };
};

/**
 * Parses a PHP PCRE pattern string into an equivalent JS `RegExp`.
 *
 * phpmd's `ignorepattern` properties (`TooManyMethods`, `TooManyPublicMethods`)
 * default to `(^(set|get|is|has|with))i`: the outer `(...)` is PCRE's
 * bracket-delimiter pair (any of `()`, `{}`, `[]`, `<>`, or a repeated
 * non-alphanumeric character both work as PCRE delimiters), not a capture
 * group, and the trailing `i` is a PCRE modifier letter, not part of the
 * pattern body. Naively passing the raw string to `new RegExp()` would
 * therefore both mismatch (treating `i` as a literal character to match) and
 * miss the case-insensitive flag entirely.
 *
 * @param {string} raw - the raw PCRE pattern string, delimiters and modifiers included.
 * @returns {RegExp} the equivalent JS `RegExp`.
 */
const parsePhpPcrePattern = (raw: string): RegExp => {
  const { body, flags } = matchDelimiters(raw.trim());
  return new RegExp(body, flags);
};

export { parsePhpPcrePattern };
