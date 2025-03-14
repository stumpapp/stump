{
  inputs = {
    nixpkgs.url = "nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
    android-nixpkgs.url = "github:tadfisher/android-nixpkgs";
  };

  outputs = { self, nixpkgs, rust-overlay, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };
        androidPkgs = import nixpkgs {
          inherit system;
          config = {
            android_sdk.accept_license = true;
            allowUnfree = true;
          };
        };

        libraries = with pkgs; [
          webkitgtk_4_1
          gtk3
          cairo
          gdk-pixbuf
          glib
          dbus
          openssl
        ];

        packages = with pkgs; [
          git

          # node
          (nodePackages.yarn.override { withNode = false; })
          nodejs_20

          # rust
          rustfmt
          rust-analyzer
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
          openssl
          glib
          gtk3
          libsoup_2_4
          webkitgtk_4_1
        ];

        genericShellConfig = {
          buildInputs = packages ++ [
            (
              # Needed for rust-analyzer
              pkgs.rust-bin.stable.latest.default.override {
                extensions = [ "rust-src" ];
              })
          ];

          # Needed for rust-analyzer
          RUST_SRC_PATH = "${
              pkgs.rust-bin.stable.latest.default.override {
                extensions = [ "rust-src" ];
              }
            }/lib/rustlib/src/rust/library";

          shellHook = ''
            export LD_LIBRARY_PATH=${
              pkgs.lib.makeLibraryPath libraries
            }:$LD_LIBRARY_PATH
          '';
        };

        # android setup
        pinnedJDK = androidPkgs.jdk17;
        androidNdkVersion = "26.1.10909125";
        androidComposition = androidPkgs.androidenv.composeAndroidPackages {
          buildToolsVersions = [ "34.0.0" "35.0.0" ];
          platformVersions = [ "34" "35" ];
          cmakeVersions = [ "3.10.2" "3.22.1" ];
          includeNDK = true;
          ndkVersions = [ androidNdkVersion ];
        };
        androidSdk = androidComposition.androidsdk;

        android-sdk-root =
          "${androidComposition.androidsdk}/libexec/android-sdk";

        androidPackages =
          (with androidPkgs; [ pinnedJDK androidSdk pkg-config ]);
        androidLibraries = (with androidPkgs; [ libxml2.out ]);

      in {
        devShells.default = pkgs.mkShell genericShellConfig;

        devShells.android = pkgs.mkShell (genericShellConfig // {
          buildInputs = genericShellConfig.buildInputs ++ androidPackages;

          JAVA_HOME = pinnedJDK;
          ANDROID_SDK_ROOT =
            "${androidComposition.androidsdk}/libexec/android-sdk";
          ANDROID_NDK_ROOT = "${android-sdk-root}/ndk-bundle";

          shellHook = ''
            export LD_LIBRARY_PATH=${
              pkgs.lib.makeLibraryPath (libraries ++ androidLibraries)
            }:$LD_LIBRARY_PATH
          '';
        });

      });
}
