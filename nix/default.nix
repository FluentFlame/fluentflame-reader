let
  nixpkgsTarball = fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/tarball/7df7ff7d8e00218376575f0acdcc5d66741351ee";
    sha256 = "sha256-gTrEEp5gEspIcCOx9PD8kMaF1iEmfBcTbO0Jag2QhQs=";
  };
  pkgs = import nixpkgsTarball {
    config = { };
    overlays = [ ];
  };
in
{
  fluentflame-reader = pkgs.callPackage ./package.nix { };
}
