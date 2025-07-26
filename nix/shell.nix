{
  mkShell,

  appimage-run,
  fluent-flame-reader,
  nodePackages,
}:

mkShell {
  packages = [
    nodePackages.prettier
    appimage-run
  ];
  inputsFrom = [
    fluent-flame-reader
  ];
}
