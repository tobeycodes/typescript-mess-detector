import { couplingBetweenObjectsRule } from "#rules/design/coupling-between-objects.js";
import { createRuleTester } from "#test/rule-tester.js";

// oxlint-disable-next-line vitest/require-hook -- RuleTester.run() delegates to describe/it internally; oxlint cannot see through that indirection.
createRuleTester().run("coupling-between-objects", couplingBetweenObjectsRule, {
  invalid: [
    {
      // Extends + 2 implements + 3 property types + 3 param types + 2 return types + 3 `new` targets = 14.
      code: `
      class Foo extends Base implements IOne, ITwo {
        private a: A;
        private b: B;
        private c: C;

        setD(d: D): void {}
        setE(e: E): void {}
        setF(f: F): void {}

        process(it: G): H {
          return null;
        }

        makeStuff() {
          new I();
          new J();
          new K();
        }
      }
      `,
      errors: [{ data: { maximum: 13, name: "Foo", value: 14 }, messageId: "tooManyDependencies" }],
    },
    {
      code: `
      class Foo {
        private a: A;
        private b: B;
        private c: C;
        private d: D;
      }
      `,
      errors: [{ data: { maximum: 3, name: "Foo", value: 4 }, messageId: "tooManyDependencies" }],
      options: [{ maximum: 3 }],
    },
  ],
  valid: [
    // Below the default maximum of 13.
    `
    class Foo {
      private a: A;
      private b: B;
      method(c: C): D {
        return new E();
      }
    }
    `,
    // Self-references and own type parameters don't count as external coupling.
    `
    class Foo<T> {
      private self: Foo<T>;
      method(value: T): Foo<T> {
        return new Foo();
      }
    }
    `,
    {
      code: `
      class Foo {
        private a: A;
        private b: B;
        private c: C;
      }
      `,
      options: [{ maximum: 5 }],
    },
  ],
});
