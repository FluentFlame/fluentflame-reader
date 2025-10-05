let
    nixpkgsTarball = fetchTarball {
        url = "https://github.com/NixOS/nixpkgs/tarball/85dbfc7aaf52ecb755f87e577ddbe6dbbdbc1054";
        sha256 = "sha256-iAcj9T/Y+3DBy2J0N+yF9XQQQ8IEb5swLFzs23CdP88=";
    };
    pkgs = import nixpkgsTarball { config = {}; overlays = []; };
in
{
    fluentflame-reader = pkgs.callPackage ./package.nix {};
}
