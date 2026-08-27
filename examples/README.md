# TypeScript Mess Detector examples

This directory holds one small file for each rule. Each file breaks exactly that
rule. Use these files to see a rule fire, or as a starting point for your own test.

Files are grouped the same way the [main README](../README.md) groups rules:
`naming/`, `controversial/`, `design/`, `cleancode/`, `unusedcode/`, and `codesize/`.

Some code size rules use a very high default threshold, such as 1000 lines for
`long-class`. A file that size would not stay "simple and small", so
`.oxlintrc.json` lowers the threshold for those specific files only, through an
`overrides` entry scoped to that one file. Each such file has a comment at the top
that states the lowered threshold.

## Run it

Build the plugin first, from the repository root:

```bash
bun run build
```

Then run oxlint against this directory:

```bash
npx oxlint -c examples/.oxlintrc.json examples
```

You should see one error per file (`development-code-fragment.ts` shows two, since
it demonstrates both checks that one rule performs), and oxlint should exit with a
non-zero status, since these files are intentionally broken.
