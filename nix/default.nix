let
  nixpkgsTarball = fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/tarball/567a49d1913ce81ac6e9582e3553dd90a955875f";
    sha256 = "sha256-lrp67w8AulE9Ks53n27I45ADSzbOCn4H+CNW1Ck8B+8=";
  };
  pkgs = import nixpkgsTarball {
    config = { };
    overlays = [ ];
  };
in
{
  fluentflame-reader = pkgs.callPackage ./package.nix { };
}
