{
  mkShell,

  appimage-run,
  fluentflame-reader,
  prettier,
}:

mkShell {
  packages = [
    prettier
    appimage-run
  ];
  inputsFrom = [
    fluentflame-reader
  ];
}
