let
  nixpkgsTarball = fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/tarball/4c1018dae018162ec878d42fec712642d214fdfa";
    sha256 = "sha256-ar3rofg+awPB8QXDaFJhJ2jJhu+KqN/PRCXeyuXR76E=";
  };
  pkgs = import nixpkgsTarball {
    config = { };
    overlays = [ ];
  };
in
{
  fluentflame-reader = pkgs.callPackage ./package.nix { };
}
