{
  buildNpmPackage,
  copyDesktopItems,
  electron,
  fetchFromGitHub,
  makeDesktopItem,
  makeWrapper,
}:
let
  pname = "fluentflame-reader";
  myElectron = electron;
  desktopItem = makeDesktopItem {
    name = pname;
    exec = pname;
    desktopName = "Fluentflame Reader";
    categories = [ "Utility" ];
    icon = pname;
  };
in

buildNpmPackage {
  inherit pname;
  version = "1.1.4";
  src = ../.;
  npmDepsHash = "";
  makeCacheWritable = true;

  env = {
    ELECTRON_SKIP_BINARY_DOWNLOAD = 1;
  };

  npmPackFlags = [ "--ignore-scripts" ];
  npmFlags = [ "--legacy-peer-deps" ];

  nativeBuildInputs = [
    copyDesktopItems
    makeWrapper
    myElectron
  ];

  buildPhase = ''
    runHook preBuild

    npm run build
    npm exec -- electron-builder build \
      --publish=never \
      --dir \
      -c.electronDist=${myElectron.dist} \
      -c.electronVersion=${myElectron.version}

    runHook postBuild
  '';

  # For using the app.asar, we need to pass ELECTRON_FORCE_IS_PACKAGED so
  # that it doesn't look for the index file.
  installPhase = ''
    runHook preInstall

    mkdir -p $out/share/${pname}
    cp -Pr --no-preserve=ownership \
        bin/*/*/*/{locales,resources{,.pak}} \
        $out/share/${pname}/

    for icon in build/icons/*.png; do
      install -Dm644 $icon $out/share/icons/hicolor/$(basename ''${icon%.png})/apps/${pname}.png
    done

    mkdir -p $out/bin
    makeWrapper '${myElectron}/bin/electron' $out/bin/${pname} \
        --add-flags "$out/share/${pname}/resources/app.asar" \
        --add-flags "\''${NIXOS_OZONE_WL:+\''${WAYLAND_DISPLAY:+--ozone-platform-hint=auto --enable-features=WaylandWindowDecorations --enable-wayland-ime=true}}" \
        --set-default ELECTRON_FORCE_IS_PACKAGED 1 \
        --inherit-argv0

    runHook postInstall
  '';

  desktopItems = [ desktopItem ];
}
