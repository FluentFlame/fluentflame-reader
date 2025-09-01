{
  description = "FluentReader: An RSS Reader Written in React";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs {
        inherit system;
      };

    in
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      rec {
        formatter = pkgs.nixfmt-tree;
        devShells = rec {
          ffr-fhs = pkgs.callPackage ./fhs_shell.nix { };
          fluentflame-reader = pkgs.callPackage ./shell.nix {
            fluentflame-reader = packages.fluentflame-reader;
          };
          default = fluentflame-reader;
        };
        packages = rec {
          fluentflame-reader = pkgs.callPackage ./package.nix { };
          default = fluentflame-reader;
        };
      }
    );
}
