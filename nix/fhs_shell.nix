# Sloppy but functional FHS Developer shell.
# Use by invoking nix-shell fhs_shell.nix

{
  pkgs,
}:

(pkgs.buildFHSEnv {
  name = "ffr-fhs";
  targetPkgs =
    pkgs:
    (with pkgs; [
      alsa-lib
      at-spi2-atk
      cairo
      cups
      dbus
      electron
      expat
      glib
      gtk3
      libGL
      libgbm
      libxkbcommon
      libz
      nodePackages.prettier
      nodejs_24
      nspr
      nss
      pango
      udev

      libxcrypt-legacy # For 'libcrypt.so.1' for deb packaging
      binutils # For ruby deb packaging, needs 'ar'
      rpm # For RPM packaging
      flatpak-builder # For flatpak building

      appimage-run # For appimage running (not building)
    ])
    ++ (with pkgs.xorg; [
      libX11
      libXcomposite
      libXcursor
      libXdamage
      libXext
      libXfixes
      libXrandr
      libxcb
    ]);
  multiPkgs =
    pkgs:
    (with pkgs; [
      udev
      alsa-lib
    ]);
}).env
