# TypeScript Mess Detector

This project ports [PHPMD](https://phpmd.org/) (PHP Mess Detector) rules to
TypeScript and JavaScript. It runs as an [oxlint](https://oxc.rs/) plugin. If you have
used PHPMD, you will recognize the rules. Examples include cyclomatic complexity,
unused private members, boolean flag arguments, and naming conventions. Each rule
works on TS and JS code. The port adapts a rule where the two languages differ.

PHPMD groups its rules into six sets: naming, codesize, design, clean code,
controversial, and unused code. This plugin uses the same six groups. Each rule name
uses kebab-case. For example, PHPMD's `ShortVariable` becomes
`mess-detector/short-variable`.

## Install

```bash
npm install --save-dev mess-detector oxlint
```

```json
// .oxlintrc.json
{
  "jsPlugins": ["mess-detector"],
  "rules": {
    "mess-detector/short-variable": "error",
    "mess-detector/boolean-argument-flag": "error",
    "mess-detector/cyclomatic-complexity": "error"
  }
}
```

Most rules take options. Pass options the same way ESLint and oxlint rules do: an
array whose first item is a config object. The config object mirrors the properties
of the source PHPMD rule.

```json
{
  "rules": {
    "mess-detector/short-variable": ["error", { "minimum": 3, "exceptions": "id,ok" }]
  }
}
```

Each section below documents one rule. Each entry names the PHPMD rule it comes from,
lists its options, and shows a bad example next to a good example. The
[`examples`](./examples) directory holds a small runnable file for each rule.

## Naming rules

These rules check names. They flag identifiers that are too short, identifiers that
are too long, and getter names that do not match what the getter returns.

### short-variable

This rule flags variable names, function parameters, and class fields that are too
short. The default minimum length is 3 characters. Loop counters such as `i` and
caught exceptions such as `e` are exempt by default. A short name gives the reader no
clue what the value holds.
([`ShortVariable`](https://phpmd.org/rules/naming.html#shortvariable))

Options:

- `minimum`. Default `3`.
- `exceptions`. A comma-separated list of names to always allow.

**Avoid**

```ts
const q = 15;
```

**Prefer**

```ts
const index = 15;
```

### long-variable

This rule flags variable names, function parameters, and class fields that are too
long. The default maximum length is 20 characters. A long name often does too much
work, or could use a shorter, clearer word.
([`LongVariable`](https://phpmd.org/rules/naming.html#longvariable))

Options:

- `maximum`. Default `20`.
- `subtract-prefixes` and `subtract-suffixes`. Substrings to remove before the rule
  measures the name's length.

**Avoid**

```ts
function main(interestingArgumentsList) {}
```

**Prefer**

```ts
function main(args) {}
```

### short-method-name

This rule flags function and method names shorter than a configured minimum. The
default minimum is 3 characters. A name such as `go()` does not say what the function
does, so the reader must read the body to find out. Constructors are always exempt.
([`ShortMethodName`](https://phpmd.org/rules/naming.html#shortmethodname))

Options:

- `minimum`. Default `3`.
- `exceptions`. A comma-separated list of names to always allow.

**Avoid**

```ts
function go() {}
```

**Prefer**

```ts
function doWork() {}
```

### long-class-name

This rule flags class and interface names longer than a configured maximum. The
default maximum is 40 characters. A very long class name often means the class has
too many jobs.
([`LongClassName`](https://phpmd.org/rules/naming.html#longclassname))

Options:

- `maximum`. Default `40`.
- `subtract-prefixes` and `subtract-suffixes`.

**Avoid**

```ts
class ATooLongClassNameThatHintsAtADesignProblem {}
```

**Prefer**

```ts
class DesignProblem {}
```

### short-class-name

This rule flags class and interface names shorter than a configured minimum. The
default minimum is 3 characters. A name such as `Fo` does not tell the reader what the
type represents.
([`ShortClassName`](https://phpmd.org/rules/naming.html#shortclassname))

Options:

- `minimum`. Default `3`.
- `exceptions`.

**Avoid**

```ts
class Fo {}
```

**Prefer**

```ts
class Foo {}
```

### constant-naming-conventions

This rule requires constant-like class members to use uppercase names. It checks
`static readonly` fields and `enum` members, and requires names such as `MY_NUM`
instead of `myTest`. TypeScript has no dedicated syntax for a class constant, so this
rule treats `static readonly` fields and `enum` members as the closest match.
([`ConstantNamingConventions`](https://phpmd.org/rules/naming.html#constantnamingconventions))

**Avoid**

```ts
class Foo {
  static readonly myTest = "";
}
```

**Prefer**

```ts
class Foo {
  static readonly MY_NUM = 0;
}
```

### boolean-get-method-name

This rule flags a method named `getX()` or `_getX()` that returns a boolean. A
boolean-returning method reads better as a question, so name it `isX()` or `hasX()`
instead.
([`BooleanGetMethodName`](https://phpmd.org/rules/naming.html#booleangetmethodname))

Options:

- `checkParameterizedMethods`. Default `false`. When `false`, the rule still checks
  methods that take parameters. Set it to `true` to skip methods with parameters.

**Avoid**

```ts
class Foo {
  getFoo(): boolean {
    return true;
  }
}
```

**Prefer**

```ts
class Foo {
  isFoo(): boolean {
    return true;
  }
}
```

Not ported: `ConstructorWithNameAsEnclosingClass`. This is PHP-only. A JS or TS
constructor always uses the `constructor` keyword, so this problem cannot happen.

## Controversial rules

PHPMD calls these rules "controversial" because not every team wants a linter to
enforce them. All six check camelCase or PascalCase naming.

### camelcase-class-name

This rule flags a class, interface, or enum name that is not PascalCase.
([`CamelCaseClassName`](https://phpmd.org/rules/controversial.html))

Options:

- `camelcase-abbreviations`. Also forbids two capital letters in a row, such as
  `HTMLParser`.

**Avoid**

```ts
class class_name {}
```

**Prefer**

```ts
class ClassName {}
```

### camelcase-method-name

This rule flags a class method name that is not camelCase. It checks class methods
only, not free functions. It always skips `constructor`. (`CamelCaseMethodName`)

Options:

- `allow-underscore`. Allows a leading underscore.
- `allow-underscore-test`. Allows underscore-separated segments after a `test`
  prefix.
- `camelcase-abbreviations`.

**Avoid**

```ts
class ClassName {
  get_name() {}
}
```

**Prefer**

```ts
class ClassName {
  getName() {}
}
```

### camelcase-property-name

This rule flags a class field name that is not camelCase. It checks only
non-computed properties. (`CamelCasePropertyName`)

Options:

- `allow-underscore`.
- `camelcase-abbreviations`.

**Avoid**

```ts
class ClassName {
  property_name = 1;
}
```

**Prefer**

```ts
class ClassName {
  propertyName = 1;
}
```

### camelcase-parameter-name

This rule flags a function, arrow function, or method parameter name that is not
camelCase. It also checks a default-value pattern such as `(user_name = "x")`, where
it checks the name `user_name`. (`CamelCaseParameterName`)

Options:

- `allow-underscore`.
- `camelcase-abbreviations`.

**Avoid**

```ts
function doSomething(user_name) {}
```

**Prefer**

```ts
function doSomething(userName) {}
```

### camelcase-variable-name

This rule flags a local `var`, `let`, or `const` declaration whose name is not
camelCase. It checks declarators only, not parameters. The rule
`camelcase-parameter-name` covers parameters, so a parameter never triggers two
warnings. (`CamelCaseVariableName`)

Options:

- `exceptions`. A comma-separated list of exact names to skip. Use this for a name you
  cannot change, such as a field from an external API response.
- `allow-underscore`.
- `camelcase-abbreviations`.

**Avoid**

```ts
function doSomething() {
  const data_module = 1;
}
```

**Prefer**

```ts
function doSomething() {
  const dataModule = 1;
}
```

### camelcase-namespace

This rule flags a TypeScript `namespace` or `module` declaration whose name is not
PascalCase. It checks each dot-separated segment on its own. PHP joins namespace
segments with a backslash. TypeScript joins them with a dot, as in
`namespace Foo.Bar {}`, and this rule checks the same way. (`CamelCaseNamespace`)

Options:

- `exceptions`. A comma-separated list of segment names to skip.
- `camelcase-abbreviations`.

**Avoid**

```ts
namespace Example.name_space {}
```

**Prefer**

```ts
namespace Example.NameSpace {}
```

Not ported: `Superglobals`. This is PHP-only. Variables such as `$_POST` and
`$_SESSION` have no JS or TS equivalent.

## Design rules

These rules check structural problems. They cover abrupt process termination,
runtime evaluation of code, classes coupled to too much of the codebase, and debug
code left in place.

### exit-expression

This rule flags a call to `process.exit()`. Such a call ends the process at once and
skips normal control flow, such as cleanup code and return values. This makes the
calling code hard to test. Throw an error instead in almost every case.
([`ExitExpression`](https://phpmd.org/rules/design.html#exitexpression))

**Avoid**

```ts
function bar() {
  process.exit(1);
}
```

**Prefer**

```ts
function bar() {
  throw new Error("bar failed");
}
```

### eval-expression

This rule flags a call to the global `eval()` function. Evaluating a string as code
at runtime is a security risk, because it can run attacker-controlled input. It is
also hard to test, because static tools cannot see what code will actually run. A
call to a method that only happens to be named `eval` on some object is not flagged.
([`EvalExpression`](https://phpmd.org/rules/design.html#evalexpression))

**Avoid**

```ts
function bar() {
  eval("1+1");
}
```

**Prefer**

```ts
function bar() {
  return 1 + 1;
}
```

### coupling-between-objects

This rule counts how many other distinct types a class depends on. It counts types
from `extends` and `implements`, from property, parameter, and return type
annotations, and from any type built with `new`. A high count means the class depends
on a large part of the rest of the system. This makes the class hard to change and
hard to reuse on its own.
([`CouplingBetweenObjects`](https://phpmd.org/rules/design.html#couplingbetweenobjects))

Options:

- `maximum`. Default `13`.

**Avoid**

```ts
// with { maximum: 3 }
class Foo {
  private a: A;
  private b: B;
  private c: C;
  private d: D;
}
```

**Prefer**

```ts
// with { maximum: 3 }
class Foo {
  private a: A;
  private b: B;
  private c: C;
}
```

### development-code-fragment

This rule flags debug code that should not reach production. By default it flags
calls to `console.log` and `console.debug`, plus the `debugger` statement. Debug code
is useful during development, but it is easy to forget to remove.
([`DevelopmentCodeFragment`](https://phpmd.org/rules/design.html#developmentcodefragment))

Options:

- `unwanted-functions`. A comma-separated list of function names to flag. The rule
  checks `debugger` only when this list includes it.

**Avoid**

```ts
function bar() {
  console.log("hi");
  debugger;
}
```

**Prefer**

```ts
function bar() {
  logger.info("hi");
}
```

### empty-catch-block

This rule flags a `catch` block with no statements in it, including a block that
holds only a comment. An empty catch block hides an error. The failure disappears
with no log message, no handling code, and no re-throw.
([`EmptyCatchBlock`](https://phpmd.org/rules/design.html#emptycatchblock))

**Avoid**

```ts
try {
  doSomething();
} catch (e) {}
```

**Prefer**

```ts
try {
  doSomething();
} catch (e) {
  handle(e);
}
```

### count-in-loop-expression

This rule flags a `.length` read on a value built inside a loop condition, for
example `Object.keys(x).length`, `Array.from(x).length`, or `arr.filter(fn).length`.
It checks `for`, `while`, and `do...while` loops. The call that builds the value runs
again on every pass through the loop.

This port is narrower than PHPMD's original rule. In PHP, `count()` and `sizeof()`
recompute the count each time, so PHPMD flags any use of them in a loop condition. In
JS, a plain `array.length` read costs no more than any other property read, so
flagging it would only add noise. This rule flags `.length` only when it follows a
call expression, since that is the case where the collection is rebuilt each pass.
([`CountInLoopExpression`](https://phpmd.org/rules/design.html#countinloopexpression))

**Avoid**

```ts
for (let i = 0; i < Object.keys(obj).length; i++) {}
```

**Prefer**

```ts
const len = Object.keys(obj).length;
for (let i = 0; i < len; i++) {}
```

Not ported: `NumberOfChildren` and `DepthOfInheritance`. Both need knowledge of the
whole program. A single-file oxlint rule cannot compute this. `GotoStatement` is
PHP-only. JS and TS have no `goto` keyword.

## Clean code rules

These rules check patterns that are valid code, but tend to hide bugs or bad design.
Examples include hidden branching behind a boolean flag, an `=` typo in a condition,
and duplicate object keys.

### boolean-argument-flag

This rule flags a boolean parameter. It flags a parameter with a boolean literal
default, such as `true` or `false`. In TypeScript, it also flags a parameter with an
explicit `boolean` type and no default. A boolean parameter often means the function
does two different jobs depending on the flag's value. Split the function into two
functions with clear names, or pass an options object instead. The reader can then
see the caller's intent without reading the function body.
([`BooleanArgumentFlag`](https://phpmd.org/rules/cleancode.html#booleanargumentflag))

Options:

- `exceptions`. A comma-separated list of class names. The rule skips flags inside
  these classes.
- `ignorepattern`. A regular expression. The rule skips a function whose name matches
  it.

**Avoid**

```ts
function bar(flag = true) {}
```

**Prefer**

```ts
function barEnabled() {}
function barDisabled() {}
```

### duplicated-array-key

Repeating the same key in an object literal is almost always a mistake. The later
entry overwrites the earlier one with no warning, so the first value is lost. This
rule flags a key that resolves to the same property name more than once. This
includes a string and a number that produce the same key, such as `foo` and `'foo'`,
or `0` and `'0'`. A `get x()` and `set x()` pair that share one name is one property,
not a duplicate, so the rule allows it.
([`DuplicatedArrayKey`](https://phpmd.org/rules/cleancode.html#duplicatedarraykey))

**Avoid**

```ts
const obj = {
  foo: "bar",
  foo: "baz",
};
```

**Prefer**

```ts
const obj = {
  foo: "bar",
  baz: "qux",
};
```

### else-expression

An `else` block after an `if` often means the logic could read top to bottom instead,
using early returns or guard clauses. Code written this way is easier to follow than
code with nested branches. This rule reports a true trailing `else`. It does not
report an `else if` link in a chain, because that link is just another `if` with its
own, possibly absent, `else`.
([`ElseExpression`](https://phpmd.org/rules/cleancode.html#elseexpression))

**Avoid**

```ts
function bar(flag) {
  if (flag) {
    return 1;
  } else {
    return 2;
  }
}
```

**Prefer**

```ts
function bar(flag) {
  if (flag) {
    return 1;
  }
  return 2;
}
```

### if-statement-assignment

Writing `=` inside a condition is usually a typo for `==` or `===`. Instead of
comparing a value, the code silently assigns it. This is a common bug that is easy to
miss during review. This rule reports any assignment found inside the condition,
including one nested inside a logical or binary expression, and a chained assignment
such as `if (a = b = c)`, which reports both assignments. PHPMD's original rule checks
only `if` and `elseif`. This port also checks `while`, `do-while`, and `for`, because
the same typo risk applies there too.
([`IfStatementAssignment`](https://phpmd.org/rules/cleancode.html#ifstatementassignment))

**Avoid**

```ts
let foo;
if ((foo = "bar")) {
}
```

**Prefer**

```ts
let foo;
if (foo === "bar") {
}
```

### static-access

Calling a method directly on what looks like a class reference, such as `Baz.qux()`,
creates a fixed, hidden dependency on that exact class. This makes the calling code
hard to test or replace. Oxlint's plugin API has no type information, so this rule
cannot confirm that `Baz` is really a class. Instead it uses a rule of thumb: flag a
non-computed method call whose object is a bare identifier written in PascalCase.
This rule of thumb can miss cases and can also flag code that is not a problem. A
PascalCase variable that is not a class will trigger a false report. A static call
reached through a lowercase alias will not be caught at all.
([`StaticAccess`](https://phpmd.org/rules/cleancode.html#staticaccess))

Options:

- `exceptions`. Exact names, or patterns using `*` as a wildcard, to exempt.
- `ignorepattern`. A regular expression. The rule skips a call inside a method whose
  name matches it.

**Avoid**

```ts
function bar() {
  Baz.qux();
}
```

**Prefer**

```ts
function bar(service) {
  service.baz();
}
```

Not ported: `ErrorControlOperator`. PHP's `@` suppression operator has no JS or TS
equivalent. `MissingImport`. PHP's fully-qualified-name and `use` system does not map
onto TS modules. `UndefinedVariable`. The TypeScript compiler already checks this, and
does so more accurately than a syntax-only rule could.

## Unused code rules

### unused-private-field

A private field that no code ever reads, writes, or otherwise references is dead
weight. It is usually left over from a refactor, or it points to a typo that broke
the intended logic without anyone noticing. This rule fills a gap in oxlint's own
built-in `no-unused-private-class-members` rule, which understands only ES `#private`
fields, not TypeScript's `private` keyword.
([`UnusedPrivateField`](https://phpmd.org/rules/unusedcode.html#unusedprivatefield))

**Avoid**

```ts
class Foo {
  private unused = 1;
}
```

**Prefer**

```ts
class Foo {
  private used = 1;
  method() {
    return this.used;
  }
}
```

### unused-private-method

A private method that no code ever calls or otherwise references is dead code. It
clutters the class, and it can hide a case where a method was meant to be wired up
but never was. This rule fills the same gap as `unused-private-field`.
([`UnusedPrivateMethod`](https://phpmd.org/rules/unusedcode.html#unusedprivatemethod))

**Avoid**

```ts
class Foo {
  private unused() {}
}
```

**Prefer**

```ts
class Foo {
  private used() {}
  public call() {
    return this.used();
  }
}
```

Not ported: `UnusedLocalVariable` and `UnusedFormalParameter`. Both duplicate oxlint's
own built-in rule **`no-unused-vars`**, which runs a real scope analysis. This is more
accurate than PHPMD's AST-based checks here. Use its `varsIgnorePattern` and
`argsIgnorePattern` options in place of PHPMD's `exceptions` properties.

## Code size rules

These rules use a threshold. Each one flags a function, method, or class once it
grows past a configured size or complexity limit. The examples below use small
numbers for readability. Each description states the real default threshold, which is
much higher.

### cyclomatic-complexity

This rule counts the number of independent paths through a function or method's
control flow. The count starts at 1. It adds 1 for each `if`, loop, `case`, `catch`,
and short-circuit operator (`&&` or `||`). A high count means more branches to read
and more paths that need test coverage. Default threshold: **10**.
([`CyclomaticComplexity`](https://phpmd.org/rules/codesize.html#cyclomaticcomplexity))

**Avoid**

```ts
function classifyOrder(status, amount, isVip, hasCoupon) {
  if (status === "cancelled") return "cancelled";
  if (status === "pending") return "pending";
  if (amount > 1000 && isVip) return "priority";
  if (amount > 1000 || hasCoupon) return "discounted";
  return "standard";
}
```

**Prefer**

```ts
const STATUS_HANDLERS = {
  cancelled: () => "cancelled",
  pending: () => "pending",
};

function classifyOrder(status, amount, isVip, hasCoupon) {
  const handler = STATUS_HANDLERS[status];
  if (handler) return handler();
  return classifyByAmount(amount, isVip, hasCoupon);
}

function classifyByAmount(amount, isVip, hasCoupon) {
  const isBigOrder = amount > 1000;
  if (isBigOrder && isVip) return "priority";
  if (isBigOrder || hasCoupon) return "discounted";
  return "standard";
}
```

### npath-complexity

This rule counts the number of distinct paths through a function's body. Cyclomatic
complexity adds 1 per branch. NPath complexity multiplies path counts through nested
branches instead, so the number grows fast and exposes deeply nested logic better.
Default threshold: **200**.
([`NPathComplexity`](https://phpmd.org/rules/codesize.html#npathcomplexity))

**Avoid**

```ts
function validate(a, b, c) {
  if (a) doA();
  if (b) doB();
  if (c) doC();
}
```

**Prefer**

```ts
function validate(a, b, c) {
  runIf(a, doA);
  runIf(b, doB);
  runIf(c, doC);
}

function runIf(condition, action) {
  if (condition) action();
}
```

### long-method

This rule measures how many lines a function or method body spans. A very long
method usually does too many jobs at once, and it is harder to read, test, and change
safely. Default threshold: **100 lines**.
([`ExcessiveMethodLength`](https://phpmd.org/rules/codesize.html#excessivemethodlength))

Options:

- `minimum`. Default `100`.
- `ignore-whitespace`. Counts only non-blank lines.

**Avoid**

```ts
function processOrder(order) {
  validateOrder(order);
  const total = order.items.reduce((sum, item) => sum + item.price, 0);
  applyDiscount(order, total);
  chargeCustomer(order, total);
  sendConfirmationEmail(order);
  updateInventory(order);
  // ...100+ lines of order-processing logic
}
```

**Prefer**

```ts
function processOrder(order) {
  validateOrder(order);
  const total = calculateTotal(order);
  applyDiscount(order, total);
  chargeCustomer(order, total);
  sendConfirmationEmail(order);
  updateInventory(order);
}

function calculateTotal(order) {
  return order.items.reduce((sum, item) => sum + item.price, 0);
}
```

### long-class

This rule measures how many lines a class declaration spans, from its opening brace
to its closing brace. A class this large is likely to hold many unrelated jobs. It
checks classes only, not interfaces. Default threshold: **1000 lines**.
([`ExcessiveClassLength`](https://phpmd.org/rules/codesize.html#excessiveclasslength))

Options:

- `minimum`. Default `1000`.
- `ignore-whitespace`.

**Avoid**

```ts
class OrderManager {
  createOrder(data) {
    /* ... */
  }
  cancelOrder(id) {
    /* ... */
  }
  sendInvoice(order) {
    /* ... */
  }
  trackShipment(order) {
    /* ...1000+ lines across unrelated jobs... */
  }
}
```

**Prefer**

```ts
class OrderManager {
  createOrder(data) {
    /* ... */
  }
  cancelOrder(id) {
    /* ... */
  }
}

class ShippingService {
  sendInvoice(order) {
    /* ... */
  }
  trackShipment(order) {
    /* ... */
  }
}
```

### long-parameter-list

This rule counts a function or method's declared parameters. A long parameter list
is easy to call in the wrong order, and it usually points to related values that
should be grouped into one object. Default threshold: **10 parameters**.
([`ExcessiveParameterList`](https://phpmd.org/rules/codesize.html#excessiveparameterlist))

**Avoid**

```ts
function createUser(firstName, lastName, email, phone, street, city, state, zip, country, dob) {
  // ...
}
```

**Prefer**

```ts
function createUser(user) {
  const { firstName, lastName, email, phone, address, dob } = user;
  // ...
}
```

### excessive-public-count

This rule counts a class's public surface. It adds every public method, including
the constructor, to every public field or accessor property. A large public surface
is hard to understand, and it is risky to change, because callers depend on more of
it. Default threshold: **45 public members**.
([`ExcessivePublicCount`](https://phpmd.org/rules/codesize.html#excessivepubliccount))

**Avoid**

```ts
class UserAccount {
  name = "";
  email = "";
  updateName() {}
  updateEmail() {}
  sendWelcomeEmail() {}
  // ...45+ public members
}
```

**Prefer**

```ts
class UserAccount {
  #name = "";
  #email = "";
  updateName() {}
  updateEmail() {}
}

class WelcomeMailer {
  send(account) {}
}
```

### too-many-fields

This rule counts every field a class declares directly, including accessor
properties, no matter its visibility. A class with too many fields usually tracks
more state than one object should own. Default threshold: **15 fields**. The rule
flags a class with more than 15.
([`TooManyFields`](https://phpmd.org/rules/codesize.html#toomanyfields))

**Avoid**

```ts
class Invoice {
  id = "";
  customerName = "";
  customerEmail = "";
  customerAddress = "";
  lineItems = [];
  taxRate = 0;
  // ...15+ fields
}
```

**Prefer**

```ts
class Invoice {
  id = "";
  customer;
  lineItems = [];
  taxRate = 0;
}

class Customer {
  name = "";
  email = "";
  address = "";
}
```

### too-many-methods

This rule counts a class's methods, excluding getters and setters. It always
excludes native `get`/`set` accessors. By default it also excludes a method named
`getFoo`, `setFoo`, `isFoo`, `hasFoo`, or `withFoo`, since a simple accessor should
not count against the limit. Too many methods usually means the class has taken on
more than one job. Default threshold: **25 methods**. The rule flags a class with
more than 25.
([`TooManyMethods`](https://phpmd.org/rules/codesize.html#toomanymethods))

Options:

- `maxmethods`. Default `25`.
- `ignorepattern`. Default excludes names that start with `get`, `set`, `is`, `has`,
  or `with`.

**Avoid**

```ts
class ReportGenerator {
  loadData() {}
  parseData() {}
  validateData() {}
  formatAsPdf() {}
  formatAsCsv() {}
  emailReport() {}
  // ...25+ methods
}
```

**Prefer**

```ts
class ReportLoader {
  loadData() {}
  parseData() {}
  validateData() {}
}

class ReportExporter {
  formatAsPdf() {}
  formatAsCsv() {}
  emailReport() {}
}
```

### too-many-public-methods

This rule counts the same way as `too-many-methods`, but it counts public methods
only. It excludes private and protected methods, native accessors, and names that
match `ignorepattern`. A large public method count means callers depend on a lot of
behavior, which makes the class fragile to change. Default threshold: **10 public
methods**. The rule flags a class with more than 10.
([`TooManyPublicMethods`](https://phpmd.org/rules/codesize.html#toomanypublicmethods))

Options:

- `maxmethods`. Default `10`.
- `ignorepattern`. Same default as `too-many-methods`.

**Avoid**

```ts
class PaymentProcessor {
  charge() {}
  refund() {}
  authorize() {}
  capture() {}
  void() {}
  // ...10+ public methods
}
```

**Prefer**

```ts
class PaymentProcessor {
  charge() {}
  refund() {}

  private authorize() {}
  private capture() {}
  private void() {}
}
```

### excessive-class-complexity

This rule computes a class's Weighted Method Count (WMC). WMC is the sum of the
cyclomatic complexity of every method the class declares directly. A high total means
the class handles a lot of branching logic overall, even when no single method looks
complex on its own. Default threshold: **50**.
([`ExcessiveClassComplexity`](https://phpmd.org/rules/codesize.html#excessiveclasscomplexity))

**Avoid**

```ts
class OrderValidator {
  checkStock(item) {
    if (item.quantity <= 0) return false;
    if (item.discontinued) return false;
    return true;
  }
  checkPayment(order) {
    if (!order.paymentMethod) return false;
    if (order.total <= 0) return false;
    return true;
  }
  // ...enough branching across methods to sum past 50
}
```

**Prefer**

```ts
class StockChecker {
  check(item) {
    if (item.quantity <= 0) return false;
    if (item.discontinued) return false;
    return true;
  }
}

class PaymentChecker {
  check(order) {
    if (!order.paymentMethod) return false;
    if (order.total <= 0) return false;
    return true;
  }
}
```

---

**A note on the complexity metrics.** PHPMD delegates cyclomatic and NPath complexity
to [pdepend](https://pdepend.org/), a separate library. This checkout does not vendor
pdepend, so its exact algorithm could not be read directly. This port instead
implements the published formulas that pdepend's own documentation describes. It does
not count `??` toward cyclomatic complexity, because pdepend's PHP-derived metric has
no equivalent operator. One known simplification applies to NPath: sibling nested
ternary or logical expressions within one statement are summed rather than
multiplied together. This pattern is rare, and NPath is a heuristic in any case.

All 10 rules from `codesize.xml` are ported. None are skipped.

## Development

```bash
bun install
bun run typecheck   # tsc --noEmit
bun run test        # vitest, using oxlint's RuleTester
bun run build       # tsup -> dist/index.js (+ .d.ts)
```
