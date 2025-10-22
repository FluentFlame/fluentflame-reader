# Nix Packaging

Fluentflame reader supports Nix packaging. So far, testing has only been
conducted using [Lix][Lix] versions 2 and up, but it's expected to build fine
with CPPNix and other implementations.

## Without flakes from source

### Shell

```shell
git clone https://github.com/FluentFlame/fluentflame-reader.git && pushd fluentflame-reader
nix-shell -E 'with import <nixpkgs> { }; callPackage ./nix/package.nix { }'
```

### Building

```shell
git clone https://github.com/FluentFlame/fluentflame-reader.git && pushd fluentflame-reader
nix-build ./nix -A fluentflame-reader --pure
```

## With flakes from source

### Shell

```shell
nix shell github:FluentFlame/fluentflame-reader?dir=nix#default
```

### Building

```shell
nix build github:FluentFlame/fluentflame-reader?dir=nix#default
```

Or...

```shell
git clone https://github.com/FluentFlame/fluentflame-reader.git && pushd fluentflame-reader
nix build ./nix#default
```

### Development shell

This gives you `npm` and lets you run electron directly on the
executed binary.

```shell
git clone https://github.com/FluentFlame/fluentflame-reader.git && pushd fluentflame-reader
nix develop ./nix#ffr-fhs
```

You can now run things like...

```bash
npm install && npm run start
# ...
npm run package-linux
# ...
npm run clean
```

[Lix]: https://lix.systems/
