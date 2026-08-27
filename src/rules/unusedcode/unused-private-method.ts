import type { ESTree, Rule } from "@oxlint/plugins";
import {
  classBodyIsAmbient,
  createPrivateMemberTracker,
  findEnclosingClassBody,
} from "#utils/private-class-members.js";

/**
 * Ported from phpmd's `UnusedPrivateMethod` rule (unusedcode.xml).
 * https://phpmd.org/rules/unusedcode.html#unusedprivatemethod
 *
 * Like `unused-private-field`, this fills a gap left by oxlint's built-in
 * `no-unused-private-class-members`: that rule only looks at ECMAScript `#private` methods, not
 * TypeScript's `private` accessibility modifier, which is the idiomatic way to write private
 * methods in TypeScript. `#private` methods are intentionally left untouched here.
 *
 * phpmd's `UnusedPrivateMethod.php` counts a method as used when it finds either an explicit call
 * (`$this->method()`) or a callable-array reference (`[$this, 'method']`). There's no JS/TS
 * analog of the callable-array form, but there is a common analogous risk: `this.method` can be
 * referenced without being called (e.g. `this.method.bind(this)`, or passed as a callback like
 * `list.map(this.method)`). To avoid false-positiving on those legitimate patterns, this rule
 * (like the field rule) treats *any* reference to `this.<name>` / `<ClassName>.<name>` as usage,
 * not just calls — a deliberate, safety-biased broadening of phpmd's narrower "must be called"
 * check.
 *
 * Excludes constructors (no JS/TS equivalent of phpmd's `__construct`/`__destruct`/`__clone`
 * carve-outs is needed beyond that, since those magic methods don't exist here). Methods with
 * decorators are skipped for the same reason fields are: decorators frequently wire a method up
 * to something outside the class's own code (DI containers, route handlers, reflection).
 */
export const unusedPrivateMethodRule: Rule = {
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
  create(context) {
    const NO_DECORATORS = 0;
    const tracker = createPrivateMemberTracker();
    return {
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
      MemberExpression(node: ESTree.MemberExpression) {
        tracker.noteMemberExpression(node);
      },
      // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- this parameter must accept or return a genuinely mutable value (array/Set mutation, or an ESTree.Node passed to context.report()); no readonly type is assignable here without breaking that
      MethodDefinition(node: ESTree.MethodDefinition) {
        if (
          node.kind === "constructor" ||
          node.accessibility !== "private" ||
          node.computed ||
          node.key.type !== "Identifier" ||
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
      "Program:exit"() {
        for (const { node, name } of tracker.unusedDeclarations()) {
          context.report({ data: { name }, messageId: "unusedMethod", node });
        }
      },
    };
  },
  meta: {
    docs: {
      description: "Disallow private class methods that are declared but never referenced.",
      url: "https://phpmd.org/rules/unusedcode.html#unusedprivatemethod",
    },
    messages: {
      unusedMethod: "Avoid unused private methods such as '{{name}}'.",
    },
    type: "suggestion",
  },
};
