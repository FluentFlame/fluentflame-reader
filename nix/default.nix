let
  nixpkgsTarball = fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/tarball/5e2a59a5b1a82f89f2c7e598302a9cacebb72a67";
    sha256 = "sha256-K5Osef2qexezUfs0alLvZ7nQFTGS9DL2oTVsIXsqLgs=";
  };
  pkgs = import nixpkgsTarball {
    config = { };
    overlays = [ ];
  };
in
{
  fluentflame-reader = pkgs.callPackage ./package.nix { };
}
