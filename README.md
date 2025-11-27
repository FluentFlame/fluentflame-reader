<p align="center">
  <img width="120" height="120" src="https://github.com/FluentFlame/fluentflame-reader/raw/master/build/icons/256x256.png">
</p>
<h3 align="center">Fluentflame Reader</h3>
<p align="center">A modern desktop RSS reader given new life</p>
<p align="center">
  <img src="https://img.shields.io/github/v/release/FluentFlame/fluentflame-reader?label=version" />
  <img src="https://img.shields.io/github/downloads/FluentFlame/fluentflame-reader/total" />
  <img src="https://img.shields.io/github/check-runs/FluentFlame/fluentflame-reader/master?logo=Linux&logoColor=white&label=checks" />
</p>
<hr />


### About this fork

Fluentflame Reader is a community fork of Fluent Reader with a maintained and constantly updated codebase and a number of new features that our contributors have added. We are a hard fork, we use the base left by Fluent Reader but we decide our own path even if that means having changes that make us very different from the original, we propose a different experience.

The differences with Fluent Reader are not only that we have different maintainers, we have different ideas, different vision and of course, different code.

## Download

[!WARNING] 
Currently we do not have any stable version!, all our builds are testing and may contain bugs, however we have released them to the community to be able to expand our testing capacity and identify new bugs, if you find any bugs do not hesitate to report it!

Download from the [Releases Page](https://github.com/FluentFlame/fluentflame-reader/releases)

If you use [Nix](https://nixos.org/download/#)/[Lix](https://lix.systems/install/) on Linux or MacOS, you can also refer our
[Nix documentation](https://github.com/FluentFlame/fluentflame-reader/tree/master/nix#readme).

## Features

<p align="center">
  <img src="https://github.com/FluentFlame/fluentflame-reader/raw/master/docs/imgs/screenshot.jpg">
</p>

- A modern UI inspired by Fluent Design System with full dark mode support.
- Read locally or sync with self-hosted services compatible with Fever or Google Reader API.
- Sync with RSS Services including Inoreader, Feedbin, The Old Reader, BazQux Reader, and more.
- Importing or exporting OPML files, full application data backup & restoration.
- Read the full content with the built-in article view or load webpages by default.
- Search for articles with regular expressions or filter by read status.
- Organize your subscriptions with folder-like groupings.
- Single-key [keyboard shortcuts](https://github.com/yang991178/fluent-reader/wiki/Support#keyboard-shortcuts).
- Hide, mark as read, or star articles automatically as they arrive with regular expression rules.
- Fetch articles in the background and send push notifications.

Support for other RSS services can be contributed through Pull Requests.

## Development

If you want to build our app from source, please look at our [building instructions](/docs/BUILDING.md)!

### Contribute

Help make Fluentflame Reader better by reporting bugs or opening feature requests through [GitHub issues](https://github.com/FluentFlame/fluentflame-reader/issues). 

You can also help internationalize the app by providing [translations into additional languages](https://github.com/FluentFlame/fluentflame-reader/tree/master/src/scripts/i18n). 
Refer to the repo of [react-intl-universal](https://github.com/alibaba/react-intl-universal) to get started on internationalization. 

### Developed with

- [Electron](https://github.com/electron/electron)
- [React](https://github.com/facebook/react)
- [Redux](https://github.com/reduxjs/redux)
- [Fluent UI](https://github.com/microsoft/fluentui)
- [Dexie](https://dexie.org/)
- [Mercury Parser](https://github.com/postlight/mercury-parser)
- [Mocha](https://mochajs.org/)

### License

BSD 3-Clause
