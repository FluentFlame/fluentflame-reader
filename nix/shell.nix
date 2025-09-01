{
  mkShell,

  appimage-run,
  fluentflame-reader,
  nodePackages,
}:

mkShell {
  packages = [
    nodePackages.prettier
    appimage-run
  ];
  inputsFrom = [
    fluentflame-reader
  ];
}
