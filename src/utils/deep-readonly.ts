/**
 * Recursively marks every property of `TValue` — including nested arrays,
 * tuples, and objects — as `readonly`, while leaving function-typed
 * properties (e.g. `Context["report"]`) untouched.
 */
export type DeepReadonly<TValue> = TValue extends (...args: readonly never[]) => infer _TReturn
  ? TValue
  : TValue extends readonly [unknown, ...unknown[]]
    ? { readonly [TIndex in keyof TValue]: DeepReadonly<TValue[TIndex]> }
    : TValue extends readonly (infer TElement)[]
      ? readonly DeepReadonly<TElement>[]
      : TValue extends object
        ? { readonly [TKey in keyof TValue]: DeepReadonly<TValue[TKey]> }
        : TValue;
