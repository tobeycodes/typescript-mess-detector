interface CamelCaseOptions {
  allowUnderscore?: boolean;
  allowUnderscoreTest?: boolean;
  camelcaseAbbreviations?: boolean;
}

const CONSECUTIVE_UPPER = /[A-Z]{2}/u;

const LOWER_START = /^[a-z][a-zA-Z0-9]*$/u;

const LOWER_START_UNDERSCORE = /^_?[a-z][a-zA-Z0-9]*$/u;

const TEST_PREFIXED = /^test[a-zA-Z0-9]*(?:_[a-z0-9][a-zA-Z0-9]*)*$/u;

const UPPER_START = /^[A-Z][a-zA-Z0-9]*$/u;

const UPPER_START_NO_ABBR = /^(?:[A-Z][a-z0-9]+)*$/u;

/**
 * Mirrors phpmd's `CamelCaseMethodName`/`CamelCasePropertyName`/etc. `isValid` logic.
 *
 * @param {string} name - the identifier to check.
 * @param {Readonly<CamelCaseOptions>} options - controls which camelCase variant is accepted.
 * @returns {boolean} whether `name` is valid camelCase under the given options.
 */
const isCamelCase = (name: string, options: Readonly<CamelCaseOptions> = {}): boolean => {
  const {
    allowUnderscore = false,
    allowUnderscoreTest = false,
    camelcaseAbbreviations = false,
  } = options;
  if (camelcaseAbbreviations && CONSECUTIVE_UPPER.test(name)) {
    return false;
  }
  if (allowUnderscoreTest && name.startsWith("test")) {
    return TEST_PREFIXED.test(name);
  }
  if (allowUnderscore) {
    return LOWER_START_UNDERSCORE.test(name);
  }
  return LOWER_START.test(name);
};

/**
 * Mirrors phpmd's `CamelCaseClassName`/`CamelCaseNamespace` pattern (PascalCase).
 *
 * @param {string} name - the identifier to check.
 * @param {Readonly<CamelCaseOptions>} options - controls whether abbreviations are accepted.
 * @returns {boolean} whether `name` is valid PascalCase under the given options.
 */
const isPascalCase = (
  name: string,
  { camelcaseAbbreviations = false }: Readonly<CamelCaseOptions> = {},
): boolean => {
  if (camelcaseAbbreviations) {
    return UPPER_START_NO_ABBR.test(name);
  }
  return UPPER_START.test(name);
};

export type { CamelCaseOptions };

export { isCamelCase, isPascalCase };
