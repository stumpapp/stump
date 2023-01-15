{
  inputs = {
    nixpkgs.url = "nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, rust-overlay, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        libraries = with pkgs;[
          webkitgtk
          gtk3
          cairo
          gdk-pixbuf
          glib
          dbus
          openssl_3
        ];

        packages = with pkgs; [
          # node
          nodePackages.pnpm
          nodejs

          # rust
          rustfmt
          clippy
          rustc
          cargo
          cargo-deny
          cargo-edit
          cargo-watch

          # Tauri deps
          curl
          wget
          pkg-config
          dbus
          openssl_3
          glib
          gtk3
          libsoup
          webkitgtk

          # avoid openssl linking error when local git version isn't compatible with openssl_3 
          git
        ];
      in
      {
        devShell = pkgs.mkShell {
        
          buildInputs = packages ++ [(
            # Needed for rust-analyzer
            pkgs.rust-bin.stable.latest.default.override {
              extensions = [ "rust-src" ];
            }
          )];

          # Needed for rust-analyzer
          RUST_SRC_PATH = "${pkgs.rust-bin.stable.latest.default.override {
              extensions = [ "rust-src" ];
          }}/lib/rustlib/src/rust/library";

          shellHook =
            ''
              export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH
            '';
        };
      });
}
