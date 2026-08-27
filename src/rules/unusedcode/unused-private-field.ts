import type { ESTree, Rule } from "@oxlint/plugins";
import {
  classBodyIsAmbient,
  createPrivateMemberTracker,
  findEnclosingClassBody,
} from "#utils/private-class-members.js";

/**
 * Ported from phpmd's `UnusedPrivateField` rule (unusedcode.xml).
 * https://phpmd.org/rules/unusedcode.html#unusedprivatefield
 *
 * oxlint already ships `no-unused-private-class-members`, but that (like ESLint's rule it's
 * based on) only understands ECMAScript `#private` fields — it does not look at TypeScript's
 * `private` accessibility modifier at all, which is the far more common way private fields are
 * written in idiomatic TypeScript. This rule fills that specific gap; it intentionally leaves
 * `#private` fields alone since the built-in rule already covers those.
 *
 * Mirrors phpmd's own detection logic: a field only needs to be *referenced* somewhere else in
 * the class (as `this.<name>` or `<ClassName>.<name>`) to count as used — reads, writes, and
 * read-modify-writes (e.g. `this.count++`) all count equally, matching `UnusedPrivateField.php`,
 * which just checks for the presence of any `PropertyPostfix` node and never distinguishes reads
 * from writes. A field only assigned once in its own declaration's initializer, and never touched
 * again, is still reported as unused.
 *
 * Also covers TypeScript's constructor parameter properties (`constructor(private foo: T)`),
 * since those declare-and-assign a private field in one step and are extremely common in
 * idiomatic TypeScript (e.g. dependency-injection-style constructors).
 *
 * Fields with decorators (e.g. `@Input() private foo`) are skipped, since decorators commonly
 * wire the field up to something outside the class (dependency injection, reflection-based
 * frameworks) in a way this rule can't see — flagging those would be a false positive. Ambient
 * `declare` fields are skipped for the same reason: they have no runtime presence of their own.
 */
export const unusedPrivateFieldRule: Rule = {
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
  create(context) {
    const NO_DECORATORS = 0;
    const tracker = createPrivateMemberTracker();
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
      MemberExpression(node: ESTree.MemberExpression) {
        tracker.noteMemberExpression(node);
      },
      "Program:exit"() {
        for (const { node, name } of tracker.unusedDeclarations()) {
          context.report({ data: { name }, messageId: "unusedField", node });
        }
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
      PropertyDefinition(node: ESTree.PropertyDefinition) {
        if (
          node.accessibility !== "private" ||
          node.computed ||
          node.key.type !== "Identifier" ||
          node.declare === true ||
          node.decorators.length > NO_DECORATORS
        ) {
          return;
        }
        const classBody = findEnclosingClassBody(node);
        if (!classBody || classBodyIsAmbient(classBody)) {
          return;
        }
        tracker.declare(node, classBody, node.key.name);
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
      TSParameterProperty(node: ESTree.TSParameterProperty) {
        if (node.accessibility !== "private" || node.decorators.length > NO_DECORATORS) {
          return;
        }
        let target: ESTree.BindingPattern = node.parameter;
        if (node.parameter.type === "AssignmentPattern") {
          target = node.parameter.left;
        }
        const classBody = findEnclosingClassBody(node);
        if (target.type !== "Identifier" || !classBody || classBodyIsAmbient(classBody)) {
          return;
        }
        tracker.declare(node, classBody, target.name);
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow private class fields that are declared but never referenced.",
      url: "https://phpmd.org/rules/unusedcode.html#unusedprivatefield",
    },
    messages: {
      unusedField: "Avoid unused private fields such as '{{name}}'.",
    },
    type: "suggestion",
  },
};
