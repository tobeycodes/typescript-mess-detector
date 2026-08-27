/* Oxlint's `import/consistent-type-specifier-style` wants the `Rule` type import split into its
   own top-level `import type` statement; `eslint/no-duplicate-imports` then flags the resulting
   two import statements from the same module. Both are enabled and want opposite things here. */
// oxlint-disable-next-line import/consistent-type-specifier-style
import { type Rule, eslintCompatPlugin } from "@oxlint/plugins";
import { booleanArgumentFlagRule } from "./rules/cleancode/boolean-argument-flag.js";
import { booleanGetMethodNameRule } from "./rules/naming/boolean-get-method-name.js";
import { camelCaseClassNameRule } from "./rules/controversial/camelcase-class-name.js";
import { camelCaseMethodNameRule } from "./rules/controversial/camelcase-method-name.js";
import { camelCaseNamespaceRule } from "./rules/controversial/camelcase-namespace.js";
import { camelCaseParameterNameRule } from "./rules/controversial/camelcase-parameter-name.js";
import { camelCasePropertyNameRule } from "./rules/controversial/camelcase-property-name.js";
import { camelCaseVariableNameRule } from "./rules/controversial/camelcase-variable-name.js";
import { constantNamingConventionsRule } from "./rules/naming/constant-naming-conventions.js";
import { countInLoopExpressionRule } from "./rules/design/count-in-loop-expression.js";
import { couplingBetweenObjectsRule } from "./rules/design/coupling-between-objects.js";
import { cyclomaticComplexityRule } from "./rules/codesize/cyclomatic-complexity.js";
import { developmentCodeFragmentRule } from "./rules/design/development-code-fragment.js";
import { duplicatedArrayKeyRule } from "./rules/cleancode/duplicated-array-key.js";
import { elseExpressionRule } from "./rules/cleancode/else-expression.js";
import { emptyCatchBlockRule } from "./rules/design/empty-catch-block.js";
import { evalExpressionRule } from "./rules/design/eval-expression.js";
import { excessiveClassComplexityRule } from "./rules/codesize/excessive-class-complexity.js";
import { excessivePublicCountRule } from "./rules/codesize/excessive-public-count.js";
import { exitExpressionRule } from "./rules/design/exit-expression.js";
import { ifStatementAssignmentRule } from "./rules/cleancode/if-statement-assignment.js";
import { longClassNameRule } from "./rules/naming/long-class-name.js";
import { longClassRule } from "./rules/codesize/long-class.js";
import { longMethodRule } from "./rules/codesize/long-method.js";
import { longParameterListRule } from "./rules/codesize/long-parameter-list.js";
import { longVariableRule } from "./rules/naming/long-variable.js";
import { npathComplexityRule } from "./rules/codesize/npath-complexity.js";
import { shortClassNameRule } from "./rules/naming/short-class-name.js";
import { shortMethodNameRule } from "./rules/naming/short-method-name.js";
import { shortVariableRule } from "./rules/naming/short-variable.js";
import { staticAccessRule } from "./rules/cleancode/static-access.js";
import { tooManyFieldsRule } from "./rules/codesize/too-many-fields.js";
import { tooManyMethodsRule } from "./rules/codesize/too-many-methods.js";
import { tooManyPublicMethodsRule } from "./rules/codesize/too-many-public-methods.js";
import { unusedPrivateFieldRule } from "./rules/unusedcode/unused-private-field.js";
import { unusedPrivateMethodRule } from "./rules/unusedcode/unused-private-method.js";

/** Every rule, keyed by rule name, for {@link eslintCompatPlugin} below. */
const mergedRules = {
  "boolean-argument-flag": booleanArgumentFlagRule,
  "boolean-get-method-name": booleanGetMethodNameRule,
  "camelcase-class-name": camelCaseClassNameRule,
  "camelcase-method-name": camelCaseMethodNameRule,
  "camelcase-namespace": camelCaseNamespaceRule,
  "camelcase-parameter-name": camelCaseParameterNameRule,
  "camelcase-property-name": camelCasePropertyNameRule,
  "camelcase-variable-name": camelCaseVariableNameRule,
  "constant-naming-conventions": constantNamingConventionsRule,
  "count-in-loop-expression": countInLoopExpressionRule,
  "coupling-between-objects": couplingBetweenObjectsRule,
  "cyclomatic-complexity": cyclomaticComplexityRule,
  "development-code-fragment": developmentCodeFragmentRule,
  "duplicated-array-key": duplicatedArrayKeyRule,
  "else-expression": elseExpressionRule,
  "empty-catch-block": emptyCatchBlockRule,
  "eval-expression": evalExpressionRule,
  "excessive-class-complexity": excessiveClassComplexityRule,
  "excessive-public-count": excessivePublicCountRule,
  "exit-expression": exitExpressionRule,
  "if-statement-assignment": ifStatementAssignmentRule,
  "long-class": longClassRule,
  "long-class-name": longClassNameRule,
  "long-method": longMethodRule,
  "long-parameter-list": longParameterListRule,
  "long-variable": longVariableRule,
  "npath-complexity": npathComplexityRule,
  "short-class-name": shortClassNameRule,
  "short-method-name": shortMethodNameRule,
  "short-variable": shortVariableRule,
  "static-access": staticAccessRule,
  "too-many-fields": tooManyFieldsRule,
  "too-many-methods": tooManyMethodsRule,
  "too-many-public-methods": tooManyPublicMethodsRule,
  "unused-private-field": unusedPrivateFieldRule,
  "unused-private-method": unusedPrivateMethodRule,
} satisfies Readonly<Record<string, Rule>>;

// Oxlint's own plugin loader does `(await import(url)).default`, requiring a default export here.
// oxlint-disable-next-line import/no-default-export
export default eslintCompatPlugin({
  meta: { name: "mess-detector" },
  rules: mergedRules,
});
