import type { DeepReadonly } from "./deep-readonly.js";
import type { ESTree } from "@oxlint/plugins";

const EMPTY_LINE = "";

const LINE_STEP = 1;

const MIN_NON_WHITESPACE_LENGTH = 0;

const ONE_INDEXED_TO_ZERO_INDEXED_OFFSET = 1;

/**
 * Mirrors phpmd's `loc`/`eloc` metrics used by `ExcessiveMethodLength` and
 * `ExcessiveClassLength`: `loc` is every source line spanned by the node
 * (inclusive), `eloc` additionally drops blank/whitespace-only lines. Both
 * rules pick between them via their `ignore-whitespace` property — despite
 * the name, `ignore-whitespace: true` means "don't count whitespace-only
 * lines", i.e. use `eloc`.
 *
 * @param {DeepReadonly<ESTree.Span>} node - the node whose source span is measured.
 * @param {readonly string[]} lines - the full source file, split into lines.
 * @param {boolean} ignoreWhitespace - when true, compute `eloc` instead of `loc`.
 * @returns {number} the resulting line count.
 */
const countLines = (
  node: DeepReadonly<ESTree.Span>,
  lines: readonly string[],
  ignoreWhitespace: boolean,
): number => {
  const endLine = node.loc.end.line;
  const startLine = node.loc.start.line;
  if (!ignoreWhitespace) {
    return endLine - startLine + LINE_STEP;
  }
  let count = 0;
  for (let line = startLine; line <= endLine; line += LINE_STEP) {
    if (
      (lines[line - ONE_INDEXED_TO_ZERO_INDEXED_OFFSET] ?? EMPTY_LINE).trim().length >
      MIN_NON_WHITESPACE_LENGTH
    ) {
      count += LINE_STEP;
    }
  }
  return count;
};

export { countLines };
