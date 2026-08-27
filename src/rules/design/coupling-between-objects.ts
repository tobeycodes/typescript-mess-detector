import type { ESTree, Rule } from "@oxlint/plugins";
import {
  addNameIfEligible,
  boundTypeParameterNames,
  expressionName,
  newExpressionTargetsOf,
  qualifiedTypeNamesOfMethod,
  qualifiedTypeNamesOfProperty,
} from "#utils/class-dependency-names.js";
import type { DeepReadonly } from "#utils/deep-readonly.js";
import { getNumberOption } from "#utils/options.js";

/**
 * Ported from phpmd's `CouplingBetweenObjects` rule (design.xml): https://phpmd.org/rules/design.html#couplingbetweenobjects
 * phpmd computes the real CBO metric (via PDepend) from property/parameter/return types, `@throws` types, and `extends`/`implements` targets.
 * This per-file, single-class port adapts that to TS's native type annotations — `extends`/`implements` targets, property/parameter/return
 * type annotations (including TS parameter properties), and `new X()` instantiations anywhere in the class body (excluding nested classes) —
 * and drops `@throws` docblock coupling, which has no TS equivalent, rather than approximating it from comments. Type names are deduped by
 * (dotted) name; the class's own name/type parameters are excluded from its own count. The generic tree-walking/type-name-extraction helpers
 * this rule relies on live in `#utils/class-dependency-names.js`.
 */

interface LineColumn {
  readonly column: number;
  readonly line: number;
}

interface NodeLocation {
  readonly end: Readonly<LineColumn>;
  readonly start: Readonly<LineColumn>;
}

/** A class's resolved coupling info. */
interface ClassCouplingInfo {
  readonly className: string;
  readonly loc: NodeLocation;
  readonly names: ReadonlySet<string>;
}

/** Minimal, fully-readonly view of the rule context this rule depends on. */
interface RuleContext {
  readonly options: readonly unknown[];
  readonly report: (
    diagnostic: Readonly<{
      readonly data: Readonly<{ maximum: number; name: string; value: number }>;
      readonly loc: Readonly<NodeLocation>;
      readonly messageId: string;
    }>,
  ) => void;
}

type ClassNode = ESTree.Class;

const DEFAULT_MAXIMUM_DEPENDENCIES = 13;

const classSelfExclusions = (node: DeepReadonly<ClassNode>): string[] => {
  const exclusions = boundTypeParameterNames(node);
  if (node.id) {
    exclusions.push(node.id.name);
  }
  return exclusions;
};

const heritageTypeNames = (
  node: DeepReadonly<ClassNode>,
  excluded: Readonly<ReadonlySet<string>>,
): string[] => {
  const names: string[] = [];
  if (node.superClass) {
    addNameIfEligible(names, expressionName(node.superClass), excluded);
  }
  if (node.implements) {
    for (const impl of node.implements) {
      addNameIfEligible(names, expressionName(impl.expression), excluded);
    }
  }
  return names;
};

/**
 * Folds every property/method type dependency in `node`'s body into `names`, mutating `excluded`
 * as method type parameters come into scope.
 * @param {DeepReadonly<ClassNode>} node - The class being analyzed.
 * @param {Set<string>} excluded - Names to skip; mutated as method type parameters are found.
 * @param {Set<string>} names - The accumulator receiving discovered dependency names.
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must mutate the caller's `excluded`/`names` Sets; a readonly Set has no `.add()`.
const recordMemberCoupling = (
  node: DeepReadonly<ClassNode>,
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  excluded: Set<string>,
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- see the disable comment on the line above.
  names: Set<string>,
): void => {
  for (const member of node.body.body) {
    if (member.type === "PropertyDefinition" || member.type === "TSAbstractPropertyDefinition") {
      for (const name of qualifiedTypeNamesOfProperty(member, excluded)) {
        names.add(name);
      }
    } else if (member.type === "MethodDefinition" || member.type === "TSAbstractMethodDefinition") {
      for (const name of qualifiedTypeNamesOfMethod(member, excluded)) {
        names.add(name);
      }
    }
  }
};

const resolveClassCouplingInfo = (node: DeepReadonly<ClassNode>): ClassCouplingInfo => {
  const excluded = new Set<string>(classSelfExclusions(node));
  const names = new Set<string>(heritageTypeNames(node, excluded));
  recordMemberCoupling(node, excluded, names);
  for (const name of newExpressionTargetsOf(node.body, excluded)) {
    names.add(name);
  }
  let className = "(anonymous class)";
  let { loc } = node;
  if (node.id) {
    ({ loc, name: className } = node.id);
  }
  return { className, loc, names };
};

const couplingBetweenObjectsRule: Rule = {
  create(context: Readonly<RuleContext>) {
    const maximum = getNumberOption(context.options, "maximum", DEFAULT_MAXIMUM_DEPENDENCIES);
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- must accept the real mutable ESTree.Node the visitor callback is given; no readonly type is assignable here.
    const visitClass = (node: ClassNode): void => {
      const info = resolveClassCouplingInfo(node);
      if (info.names.size < maximum) {
        return;
      }
      context.report({
        data: { maximum, name: info.className, value: info.names.size },
        loc: info.loc,
        messageId: "tooManyDependencies",
      });
    };
    return {
      ClassDeclaration: visitClass,
      ClassExpression: visitClass,
    };
  },
  meta: {
    docs: {
      description:
        "Disallow classes with too many distinct external type dependencies (coupling between objects).",
      url: "https://phpmd.org/rules/design.html#couplingbetweenobjects",
    },
    messages: {
      tooManyDependencies:
        "The class '{{name}}' has a coupling between objects value of {{value}}. Consider reducing the number of dependencies below {{maximum}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: { maximum: { type: "number" } },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

export { couplingBetweenObjectsRule };
