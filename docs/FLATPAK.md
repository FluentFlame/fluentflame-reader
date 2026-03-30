# Configuring for Flatpak and Flathub

Fluentflame Reader seeks to have regularly built and uploaded Flathub
distributions. For those wanting to go through the process of Creating a
Flathub-compatible flatpak build of Fluentflame Reader, this document is
for you.

## Dependencies

You need to have `flatpak` itself installed. Install it via your Linux
system package manager. e.g. for Debian:

```bash
# Debian based distros (e.g. Debian, Ubuntu, Mint, Devuan)
sudo apt install flatpak
```

Add the flathub remote:

```bash
flatpak remote-add --if-not-exists --user \
  flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

Install the `flatpak-builder` flatpak, and various SDK dependencies:

```bash
# Builder
flatpak install -y flathub org.flatpak.Builder

# Dependencies we use for the runtime
flatpak install -y flathub
```

## Getting the source code

TODO

## Getting `flatpak/generated-sources.json`

We have to generate a set of source files for all NPM dependencies.
This source file must exactly match the `patches-lock.json` file at
the given commit.

### Cleanup

The generation script will NOT work if you have an existing `node_modules`
directory.

```bash
# Inside fluentflame-reader
rm -rf node_modules/
```

You also need to be 100% certain that your `package-lock.json` matches the
exact version of the archive we'll be pulling from the manifest. This may
mean you need to change the manifest file or you need to replace your
package-lock.json to match the archive you're pulling down.

If a build has failed midway through, you may want to delete these
intermediate directories:

```
# Inside fluentflame-reader, after a failed build
rm -rf flatpak_out .flatpack-builder
```

This will get you in a fresh build state.

### Generating the node dependency sources

This is easiest to use with `pipx` as directed by the [documentation](https://github.com/flatpak/flatpak-builder-tools/tree/master/node).
Install it like so through `pipx`:

```bash
pipx install git+https://github.com/flatpak/flatpak-builder-tools.git#subdirectory=node
```

Otherwise, install it [from pypi](https://pypi.org/project/flatpak-node-generator/)
using your method of choice (e.g. pip venvs).

Then run the following:

```bash
mkdir -p flatpak
flatpak-node-generator -o flatpak/generated-sources.json npm package-lock.json
```

This will record the lockfile sha's into `flatpak/generated-sources.json`,
which will direct flatpak builder on the exact dependency versions we need.

## Building the Flatpak

Now that everything is in order, we should now be able to build the flatpak
from manifest:

```bash
flatpak run org.flatpak.Builder \
  flatpak_out \
  org.fluentflame.fluentflame-reader.yaml
```

This should then produce the final Flathub-compatible flatpak in `flatpak_out`.
