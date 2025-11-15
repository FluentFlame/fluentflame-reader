let
  nixpkgsTarball = fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/tarball/c5ae371f1a6a7fd27823bc500d9390b38c05fa55";
    sha256 = "sha256-4PqRErxfe+2toFJFgcRKZ0UI9NSIOJa+7RXVtBhy4KE=";
  };
  pkgs = import nixpkgsTarball {
    config = { };
    overlays = [ ];
  };
in
{
  fluentflame-reader = pkgs.callPackage ./package.nix { };
}
