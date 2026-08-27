import type { ESTree } from "@oxlint/plugins";
import { isString } from "./type-guards.js";

/**
 * TS class members default to public visibility unless explicitly marked
 * `private`/`protected`, matching PHP's own explicit `public`/`private`/`protected`
 * modifiers that phpmd's public-member-counting rules (`ExcessivePublicCount`,
 * `TooManyPublicMethods`) key off of.
 *
 * @param {ESTree.TSAccessibility | undefined} accessibility - the member's accessibility
 *   modifier, or `undefined` when absent. ESTree itself represents "no modifier" as `null`;
 *   callers normalize that to `undefined` before calling in, keeping `null` literals out of
 *   this module.
 * @returns {boolean} whether the member is publicly visible.
 */
export const isPublicMember = (accessibility: ESTree.TSAccessibility | undefined): boolean => {
  if (isString(accessibility)) {
    return accessibility === "public";
  }
  return true;
};
