# Building Instructions

To build Fluentflame from source you need to have the following tools installed on your system:

- [git](https://git-scm.com/install/)
- [Node.js](https://nodejs.org/es/download)
 
Next you have to clone our repository like this:

```bash
git clone https://github.com/FluentFlame/fluentflame-reader.git
```

Or change the repo link for: git@github.com:FluentFlame/fluentflame-reader.git if you use ssh.

---
## Dependencies

Go to the cloned directory and install the necessary dependencies with:

```bash
npm install
```

This will install the packages that Fluentflame needs to build, don't worry, this will only install those dependencies to the cloned directory, not to your global system :)

---

## Compile ts & dependencies

Simply type this on your terminal:

```bash
npm run build
```

With this command you will proceed to compile everything you need to run the app, keep in mind that depending on the hardware you use this can be fast or it can take time. If you have any errors such as "JavaScript heap out of memory error" try to increase the node.js memory limit to a higher level (if you have enough memory), currently the lowest low end hardware we have tested is an intel core 2 duo with 2gb of memory where the solution to run the build was to raise the limit to 1280 like this: NODE_OPTIONS="--max-old-space-size=1280".

---

## Start the application and test run

If you just want to test the app without packaging it, run this:

```bash
npm run electron
```

Also you can quickly check if everything is okay by running a simple test like this:

```bash
npm run test
```

---

## Package app for windows

First of all, you'll probably need a certificate for code signing. Generate one with:

```bash
electron-builder create-self-signed-cert
```

And you are now ready to make the windows package:

```bash
npm run package-win
```
---

## Package app for Linux specifics formats

On Linux there are different package formats and it can be confusing, but if you need help figuring out which package you need, don't worry, an explanation will be added in each format n.n

- AppImage: AppImage is a "more global" format, you can read about it [here](https://appimage.org/), but the important thing is: it can run on different distributions (if they support it) and it's portable, you don't even need to install it. To package the app in this format just run:

```bash
npm run package-appimage
```

- Deb package: If you're using a Linux distribution like Ubuntu or Debian or any based on them, it's probably more convenient to package the app in.deb. To do this, run:

```bash
npm run package-deb
```

- Tarball: Use this if you don't want to use AppImage and you're not on a distribution that supports deb packages (like Arch Linux)

```bash
npm run package-tarball
```

---

### Package app for macOS

To build the mac package the only option currently available is:

```bash
npm run package-universal-mac
```

And that's it!

---

I hope these instructions have been useful for you, we made them thinking that they would be understandable by both beginners and experts. Something more human than just empty instructions.

Please let us know if you have any opinions or suggestions for changes to these instructions, as we would be happy to receive feedback.