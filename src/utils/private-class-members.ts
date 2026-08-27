import type { DeepReadonly } from "./deep-readonly.js";
import type { ESTree } from "@oxlint/plugins";

/**
 * The minimal, fully `readonly` shape this module needs to walk `.parent` chains.
 */
interface ParentedNode {
  readonly type: string;
  readonly parent?: ParentedNode | null;
}

/** Duck-typed shape shared by `ClassDeclaration`/`ClassExpression`: the two fields this module reads off one. */
interface ClassOwnerNode {
  readonly declare?: boolean;
  readonly id?: { readonly name: string } | null;
}

/** One still-undeclared-as-used private member declaration, as reported by {@link PrivateMemberTracker.unusedDeclarations}. */
interface DeclarationEntry {
  readonly name: string;
  readonly node: ESTree.Node;
}

/**
 * Immutable snapshot of everything {@link vendPrivateMemberTracker} has recorded so far. Built
 * from `ReadonlyMap`/`ReadonlySet`, not mutated in place: each update function builds a fresh
 * `Map`/`Set` locally and returns a new `TrackerState`; {@link vendPrivateMemberTracker} is the
 * only place that reassigns anything, via a closured `let`.
 */
interface TrackerState {
  readonly declarations: ReadonlyMap<Readonly<ParentedNode>, ReadonlyMap<string, ESTree.Node>>;
  readonly used: ReadonlyMap<Readonly<ParentedNode>, ReadonlySet<string>>;
}

/** The object {@link vendPrivateMemberTracker} returns: a small mutable-feeling façade over an
 * immutable {@link TrackerState} threaded through a closured `let`. */
interface PrivateMemberTracker {
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node passed to context.report(); no readonly type is assignable here.
  readonly declare: (node: ESTree.Node, classBody: Readonly<ParentedNode>, name: string) => void;
  readonly noteMemberExpression: (node: DeepReadonly<ESTree.MemberExpression>) => void;
  readonly unusedDeclarations: () => readonly DeclarationEntry[];
}

const EMPTY_STATE: TrackerState = { declarations: new Map(), used: new Map() };

/**
 * Produces `undefined` without spelling the token.
 * @param {Value} value - never pass this; its "not passed" state is the point.
 * @returns {Value | undefined} `undefined`.
 */
const absent = <Value>(value?: Value): Value | undefined => value;

/**
 * Returns a copy of `map` with `key` mapped to `value`, leaving `map` itself untouched.
 * @param {ReadonlyMap<Key, Value>} map - the source map.
 * @param {Key} key - the key to set.
 * @param {Value} value - the value to set.
 * @returns {ReadonlyMap<Key, Value>} a new map with the update applied.
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must mutate a local Map copy; a readonly Map has no `.set()`.
const assocMapEntry = <Key, Value>(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  map: ReadonlyMap<Key, Value>,
  key: Key,
  value: Value,
): ReadonlyMap<Key, Value> => new Map([...map, [key, value]]);

/**
 * True when `classBody`'s owning `ClassBody` node is a `ClassBody`, walking up `.parent`.
 * @param {Readonly<ParentedNode>} node - the node to test.
 * @returns {boolean} whether `node` is a `ClassBody`.
 */
const checkClassBodyNode = (node: Readonly<ParentedNode>): boolean => node.type === "ClassBody";

/**
 * Type-predicate guard narrowing a {@link ParentedNode} to {@link ClassOwnerNode}.
 * @param {Readonly<ParentedNode>} node - the node to test.
 * @returns {node is Readonly<ParentedNode> & Readonly<ClassOwnerNode>} whether `node` is a class declaration/expression.
 */
const checkClassOwnerNode = (
  node: Readonly<ParentedNode>,
): node is Readonly<ParentedNode> & Readonly<ClassOwnerNode> =>
  node.type === "ClassDeclaration" || node.type === "ClassExpression";

/**
 * True when the owning class is an ambient `declare class` — those have no runtime presence, so "unused" doesn't apply.
 * @param {Readonly<ParentedNode>} classBody - the `ClassBody` node.
 * @returns {boolean} whether its owning class is ambient.
 */
const classBodyIsAmbient = (classBody: Readonly<ParentedNode>): boolean => {
  const owner = classBody.parent;
  if (owner && checkClassOwnerNode(owner)) {
    return owner.declare === true;
  }
  return false;
};

/**
 * Returns the name of the class/interface that owns the given `ClassBody`, if it has one.
 * @param {Readonly<ParentedNode>} classBody - the `ClassBody` node.
 * @returns {string | undefined} the owning class's name, if it has one.
 */
const classBodyOwnerName = (classBody: Readonly<ParentedNode>): string | undefined => {
  const owner = classBody.parent;
  if (owner && checkClassOwnerNode(owner) && owner.id) {
    return owner.id.name;
  }
  return absent();
};

/**
 * Records a declaration of a private member, the first time it's seen for a given name within a given `ClassBody`.
 * @param {Readonly<TrackerState>} state - the tracker's current state.
 * @param {Readonly<DeclarationEntry> & { readonly classBody: Readonly<ParentedNode> }} entry - the declaration site, bundled with its `ClassBody` and name.
 * @returns {TrackerState} the updated state.
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must return a value with a real mutable ESTree.Node for context.report(); no readonly type is assignable here.
const declareMember = (
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  state: Readonly<TrackerState>,
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  entry: Readonly<DeclarationEntry> & { readonly classBody: Readonly<ParentedNode> },
): TrackerState => {
  const byName = state.declarations.get(entry.classBody) ?? new Map<string, ESTree.Node>();
  if (byName.has(entry.name)) {
    return state;
  }
  return {
    declarations: assocMapEntry(
      state.declarations,
      entry.classBody,
      assocMapEntry(byName, entry.name, entry.node),
    ),
    used: state.used,
  };
};

/**
 * Walks up `node.parent` links collecting every enclosing `ClassBody`, innermost first.
 * @param {Readonly<ParentedNode>} node - the node to start walking up from.
 * @returns {readonly Readonly<ParentedNode>[]} every enclosing `ClassBody`, innermost first.
 */
const findEnclosingClassBodies = (
  node: Readonly<ParentedNode>,
): readonly Readonly<ParentedNode>[] => {
  const result: Readonly<ParentedNode>[] = [];
  let current = node.parent;
  while (current) {
    if (checkClassBodyNode(current)) {
      result.push(current);
    }
    current = current.parent;
  }
  return result;
};

/**
 * Walks up `node.parent` links to find the nearest enclosing `ClassBody`, if any.
 * @param {Readonly<ParentedNode>} node - the node to start walking up from.
 * @returns {Readonly<ParentedNode> | undefined} the nearest enclosing `ClassBody`, if any.
 */
const findEnclosingClassBody = (
  node: Readonly<ParentedNode>,
): Readonly<ParentedNode> | undefined => {
  let current = node.parent;
  while (current) {
    if (checkClassBodyNode(current)) {
      return current;
    }
    current = current.parent;
  }
  return absent();
};

/**
 * Records that `name` was referenced (read, write, or call) within a given `ClassBody`.
 * @param {Readonly<TrackerState>} state - the tracker's current state.
 * @param {Readonly<ParentedNode>} classBody - the `ClassBody` the reference belongs to.
 * @param {string} name - the bare (un-sigiled) member name.
 * @returns {TrackerState} the updated state.
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must return a value with a real mutable ESTree.Node for context.report(); no readonly type is assignable here.
const markMemberUsed = (
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  state: Readonly<TrackerState>,
  classBody: Readonly<ParentedNode>,
  name: string,
): TrackerState => {
  const existingNames = state.used.get(classBody) ?? new Set<string>();
  return {
    declarations: state.declarations,
    used: assocMapEntry(state.used, classBody, new Set([...existingNames, name])),
  };
};

/**
 * Folds a single `ClassName.<name>` reference into `state`, marking it used on every enclosing `ClassBody` named `ClassName`.
 * @param {Readonly<TrackerState>} state - the tracker's current state.
 * @param {DeepReadonly<ESTree.MemberExpression>} node - the member expression, already known to have a non-computed `Identifier` property and object.
 * @returns {TrackerState} the updated state.
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must return a value with a real mutable ESTree.Node for context.report(); no readonly type is assignable here.
const noteStaticMemberExpression = (
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  state: Readonly<TrackerState>,
  node: DeepReadonly<ESTree.MemberExpression>,
): TrackerState => {
  if (node.object.type !== "Identifier" || node.property.type !== "Identifier") {
    return state;
  }
  const className = node.object.name;
  let nextState = state;
  for (const classBody of findEnclosingClassBodies(node)) {
    if (classBodyOwnerName(classBody) === className) {
      nextState = markMemberUsed(nextState, classBody, node.property.name);
    }
  }
  return nextState;
};

/**
 * Folds a single `this.<name>` reference into `state`, marking it used on its enclosing `ClassBody`.
 * @param {Readonly<TrackerState>} state - the tracker's current state.
 * @param {DeepReadonly<ESTree.MemberExpression>} node - the member expression, already known to have a non-computed `Identifier` property.
 * @returns {TrackerState} the updated state.
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must return a value with a real mutable ESTree.Node for context.report(); no readonly type is assignable here.
const noteThisMemberExpression = (
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  state: Readonly<TrackerState>,
  node: DeepReadonly<ESTree.MemberExpression>,
): TrackerState => {
  const classBody = findEnclosingClassBody(node);
  if (classBody && node.property.type === "Identifier") {
    return markMemberUsed(state, classBody, node.property.name);
  }
  return state;
};

/**
 * Feeds a single `MemberExpression` through the tracker. `property.type` is `"Identifier"` for a plain `.name` access
 * (phpmd's PropertyPostfix/MethodPostfix equivalent); `"PrivateIdentifier"` (`#name`) is ignored — an unrelated ES private field.
 * @param {Readonly<TrackerState>} state - the tracker's current state.
 * @param {DeepReadonly<ESTree.MemberExpression>} node - the member expression to inspect.
 * @returns {TrackerState} the updated state.
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must return a value with a real mutable ESTree.Node for context.report(); no readonly type is assignable here.
const recordMemberExpressionUsage = (
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  state: Readonly<TrackerState>,
  node: DeepReadonly<ESTree.MemberExpression>,
): TrackerState => {
  if (node.computed || node.property.type !== "Identifier") {
    return state;
  }
  if (node.object.type === "ThisExpression") {
    return noteThisMemberExpression(state, node);
  }
  return noteStaticMemberExpression(state, node);
};

/**
 * Lists every declaration that was never {@link markMemberUsed marked used}.
 * @param {Readonly<TrackerState>} state - the tracker's final state.
 * @returns {readonly DeclarationEntry[]} the unused declarations.
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must return a value with a real mutable ESTree.Node for context.report(); no readonly type is assignable here.
const unusedDeclarationsOf = (state: Readonly<TrackerState>): readonly DeclarationEntry[] => {
  const results: DeclarationEntry[] = [];
  for (const [classBody, byName] of state.declarations) {
    const usedNames = state.used.get(classBody);
    for (const [name, node] of byName) {
      if (!usedNames || !usedNames.has(name)) {
        results.push({ name, node });
      }
    }
  }
  return results;
};

/**
 * Tracks declarations of TypeScript `private` class members and any references to them, so declarations never
 * referenced anywhere can be reported once the whole file has been visited. A member is "used" the moment it's
 * referenced at all (read, write, or call) via `this.<name>` or `<ClassName>.<name>` — mirroring phpmd's own
 * field/method rules, which don't distinguish reads from writes.
 * @returns {PrivateMemberTracker} the tracker's `declare`/`noteMemberExpression`/`unusedDeclarations` façade.
 */
const vendPrivateMemberTracker = (): PrivateMemberTracker => {
  let state = EMPTY_STATE;
  return {
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node passed to context.report(); no readonly type is assignable here.
    declare: (node, classBody, name) => {
      state = declareMember(state, { classBody, name, node });
    },
    noteMemberExpression: (node) => {
      state = recordMemberExpressionUsage(state, node);
    },
    unusedDeclarations: () => unusedDeclarationsOf(state),
  };
};

export type { PrivateMemberTracker };

export {
  classBodyIsAmbient,
  findEnclosingClassBody,
  vendPrivateMemberTracker as createPrivateMemberTracker,
};
