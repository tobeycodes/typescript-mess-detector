import type { DeepReadonly } from "./deep-readonly.js";
import type { ESTree } from "@oxlint/plugins";

/**
 * Generic, class-agnostic helpers for extracting the distinct type/value names a class body
 * depends on (via type annotations, `extends`/`implements`, and `new X()` instantiations).
 * Split out of `src/rules/design/coupling-between-objects.ts` (the sole consumer) — every
 * export here is otherwise specific to that one rule.
 */

type Node = ESTree.Node & { parent?: ESTree.Node | null };

type BoundTypeParameters = DeepReadonly<{
  typeParameters?: { params: readonly { name: { name: string } }[] } | null;
}>;

const EMPTY_NAME_LENGTH = 0;

const EMPTY_TARGET_STACK_LENGTH = 0;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must mutate the caller's accumulator array; a readonly array has no `.push()`.
const addNameIfEligible = (
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  names: string[],
  name: string,
  excluded: Readonly<ReadonlySet<string>>,
): void => {
  if (name.length > EMPTY_NAME_LENGTH && !excluded.has(name)) {
    names.push(name);
  }
};

// Reads the names bound by an optional `typeParameters` declaration (class or function).
const boundTypeParameterNames = (node: BoundTypeParameters): string[] => {
  if (node.typeParameters) {
    return node.typeParameters.params.map((param) => param.name.name);
  }
  return [];
};

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must mutate the caller's traversal stack; a readonly array has no `.push()`.
const enqueueArrayElements = (
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  stack: DeepReadonly<{ isRoot: boolean; node: unknown }>[],
  items: readonly unknown[],
): void => {
  for (const element of items) {
    stack.push({ isRoot: false, node: element });
  }
};

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must mutate the caller's traversal stack; a readonly array has no `.push()`.
const enqueueChildValues = (
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  stack: DeepReadonly<{ isRoot: boolean; node: unknown }>[],
  node: DeepReadonly<Node>,
): void => {
  for (const [key, value] of Object.entries(node)) {
    if (key !== "parent") {
      stack.push({ isRoot: false, node: value });
    }
  }
};

const expressionName = (node: DeepReadonly<ESTree.Node>): string => {
  let name = "";
  if (node.type === "Identifier") {
    ({ name } = node);
  } else if (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier"
  ) {
    const objectName = expressionName(node.object);
    const { name: propertyName } = node.property;
    name = propertyName;
    if (objectName.length > EMPTY_NAME_LENGTH) {
      name = `${objectName}.${propertyName}`;
    }
  }
  return name;
};

const isNodeLike = <TCandidate>(value: TCandidate): value is TCandidate & Node =>
  value !== null && typeof value === "object" && "type" in value && typeof value.type === "string";

// Collects `new X()` targets anywhere under `root`, without descending into nested classes.
const newExpressionTargetsOf = (
  root: DeepReadonly<ESTree.Node>,
  excluded: Readonly<ReadonlySet<string>>,
): string[] => {
  const names: string[] = [];
  const stack: DeepReadonly<{ isRoot: boolean; node: unknown }>[] = [{ isRoot: true, node: root }];
  const visit = (item: DeepReadonly<{ isRoot: boolean; node: unknown }>): void => {
    const { isRoot, node: current } = item;
    if (Array.isArray(current)) {
      enqueueArrayElements(stack, current);
      return;
    }
    if (
      !isNodeLike(current) ||
      (!isRoot && (current.type === "ClassDeclaration" || current.type === "ClassExpression"))
    ) {
      return;
    }
    if (current.type === "NewExpression") {
      addNameIfEligible(names, expressionName(current.callee), excluded);
    }
    enqueueChildValues(stack, current);
  };
  while (stack.length > EMPTY_TARGET_STACK_LENGTH) {
    const next = stack.pop();
    if (next) {
      visit(next);
    }
  }
  return names;
};

/**
 * Unwraps a TS parameter property/default value to its binding, returning only the field read
 * here.
 * @param {DeepReadonly<ESTree.ParamPattern>} param - A function/method parameter node.
 * @returns {DeepReadonly<{ typeAnnotation?: { typeAnnotation: DeepReadonly<ESTree.Node> } | null }>} The binding's type annotation, if any.
 */
const paramBindingTarget = (
  param: DeepReadonly<ESTree.ParamPattern>,
): DeepReadonly<{ typeAnnotation?: { typeAnnotation: DeepReadonly<ESTree.Node> } | null }> => {
  if (param.type === "TSParameterProperty") {
    if (param.parameter.type === "AssignmentPattern") {
      return param.parameter.left;
    }
    return param.parameter;
  }
  if (param.type === "AssignmentPattern") {
    return param.left;
  }
  return param;
};

// The type-annotation nodes to recurse into for a "wrapper" type node, or none for a leaf/reference type.
const qualifiedTypeChildrenOf = (
  node: DeepReadonly<ESTree.Node>,
): readonly DeepReadonly<ESTree.Node>[] => {
  if (node.type === "TSArrayType") {
    return [node.elementType];
  }
  if (node.type === "TSParenthesizedType") {
    return [node.typeAnnotation];
  }
  if (node.type === "TSUnionType" || node.type === "TSIntersectionType") {
    return node.types;
  }
  if (node.type === "TSTupleType") {
    return node.elementTypes;
  }
  return [];
};

const qualifiedTypeName = (node: DeepReadonly<ESTree.Node>): string => {
  let name = "";
  if (node.type === "Identifier") {
    ({ name } = node);
  } else if (node.type === "TSQualifiedName") {
    const left = qualifiedTypeName(node.left);
    ({ name } = node.right);
    if (left.length > EMPTY_NAME_LENGTH) {
      name = `${left}.${node.right.name}`;
    }
  }
  return name;
};

// The type name a `TSTypeReference` itself contributes, ignoring its type arguments.
const qualifiedTypeNameOnly = (
  node: DeepReadonly<ESTree.TSTypeReference>,
  excluded: Readonly<ReadonlySet<string>>,
): string[] => {
  const names: string[] = [];
  addNameIfEligible(names, qualifiedTypeName(node.typeName), excluded);
  return names;
};

const qualifiedTypeNamesOf = (
  node: DeepReadonly<ESTree.Node>,
  excluded: Readonly<ReadonlySet<string>>,
): string[] => {
  const names = qualifiedTypeChildrenOf(node).flatMap((child) =>
    qualifiedTypeNamesOf(child, excluded),
  );
  if (node.type !== "TSTypeReference") {
    return names;
  }
  names.push(...qualifiedTypeNameOnly(node, excluded));
  if (node.typeArguments) {
    names.push(
      ...node.typeArguments.params.flatMap((param) => qualifiedTypeNamesOf(param, excluded)),
    );
  }
  return names;
};

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must mutate the caller's `excluded` Set as method type parameters come into scope; a readonly Set has no `.add()`.
const qualifiedTypeNamesOfMethod = (
  member: DeepReadonly<ESTree.MethodDefinition>,
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  excluded: Set<string>,
): string[] => {
  const fn = member.value;
  const ownTypeParameterNames = boundTypeParameterNames(fn);
  const scopedExcluded = new Set([...excluded, ...ownTypeParameterNames]);
  const typeNamesFromParams = fn.params.flatMap((param) => {
    const target = paramBindingTarget(param);
    if (target.typeAnnotation) {
      return qualifiedTypeNamesOf(target.typeAnnotation.typeAnnotation, scopedExcluded);
    }
    return [];
  });
  for (const name of ownTypeParameterNames) {
    excluded.add(name);
  }
  let returnNames: string[] = [];
  if (fn.returnType) {
    returnNames = qualifiedTypeNamesOf(fn.returnType.typeAnnotation, scopedExcluded);
  }
  return [...typeNamesFromParams, ...returnNames];
};

const qualifiedTypeNamesOfProperty = (
  member: DeepReadonly<ESTree.PropertyDefinition>,
  excluded: Readonly<ReadonlySet<string>>,
): string[] => {
  if (member.typeAnnotation) {
    return qualifiedTypeNamesOf(member.typeAnnotation.typeAnnotation, excluded);
  }
  return [];
};

export {
  addNameIfEligible,
  boundTypeParameterNames,
  expressionName,
  newExpressionTargetsOf,
  qualifiedTypeNamesOfMethod,
  qualifiedTypeNamesOfProperty,
};
