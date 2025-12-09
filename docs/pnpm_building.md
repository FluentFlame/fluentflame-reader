# PNPM Instructions

Fluentflame Reader also tries to be [`pnpm`](https://pnpm.io/) build-compatible on a best-effort basis.
You will need to have `pnpm` available before running any of the following commands.

## Dependencies

Similar to the `npm` build instructions, you can install dependencies with:

```bash
pnpm install
```

## Compile ts & run webpack

Compile the typescript and generate the `dist/` directory with:

```bash
pnpm build  # Actually compile and pack it
```

This command generates the `dist/` directory, which acts as a testing ground for packaging.

## Start the application & run

If you just want to test the app without packaging it, run this:

```bash
pnpm electron
```

You can also do a simple test to check very basic things like this:

```bash
pnpm test
```

And that's it!

# Packaging

Packaging the application is identical to the main packaging instructions,
but with `npx` and `npm` replaced with `pnpm`. Please see the original building
[documentation](/docs/BUILDING.md).
