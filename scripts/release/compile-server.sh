#!/bin/bash

SCRIPTS_DIR="${BASH_SOURCE%/*}/.."
source "${SCRIPTS_DIR}/lib"

echo "Ensuring targets for apple(x86_64,darwin),linux(x86_64,arm64), and windows(x86_64) are installed..."

set -ex; \
  rustup target add x86_64-apple-darwin; \
  rustup target add aarch64-apple-darwin; \
  rustup target add x86_64-unknown-linux-gnu; \
  rustup target add aarch64-unknown-linux-gnu; \
  rustup target add x86_64-pc-windows-gnu; \
  set +x

# https://www.shogan.co.uk/development/rust-cross-compile-linux-to-macos-using-github-actions/
# https://stackoverflow.com/questions/66849112/how-do-i-cross-compile-a-rust-application-from-macos-x86-to-macos-silicon
# https://gist.github.com/shqld/256e2c4f4b97957fb0ec250cdc6dc463
# lol, at this point, I think it might just be easier to use GH hosted runners
# for the executable builds... Which would mean instead of this scripting doing it all,
# it would just run a subset of these operations on a per-os basis. E.g. the linux
# build would just run the linux-specific commands, and the macos build would just
# run the macos-specific commands. This would also mean that the build process
# would be a lot more straightforward, and would be a lot easier to maintain? Maybe to start,
# I trim it even further. Don't support both arm+x86, just do vanilla builds for each

echo "Targets installed."

CALL_TO_ACTION_LOL="Please consider helping to expand support for your system: https://github.com/aaronleopold/stump/issues"

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  UNSUPPORTED_DISTRO="Your distro '$(lsb_release -s -d)' is not supported by this script. $CALL_TO_ACTION_LOL"
  
  if which apt-get &> /dev/null; then
    # TODO: add support for other distros
    log_error "$UNSUPPORTED_DISTRO"
  elif which pacman &> /dev/null; then
    set -ex; \
      sudo pacman -S --needed mingw-w64-gcc
  elif which dnf &> /dev/null; then
    # TODO: add support for other distros
    log_error "$UNSUPPORTED_DISTRO"
  else
    log_error "$UNSUPPORTED_DISTRO"
  fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
  set -ex; \
    set HOMEBREW_NO_AUTO_UPDATE=1; \
    brew tap messense/macos-cross-toolchains; \
    brew install filosottile/musl-cross/musl-cross mingw-w64 x86_64-unknown-linux-gnu aarch64-unknown-linux-gnu; \
    set +x

  if which musl-gcc &> /dev/null; then
    echo "musl-gcc installed successfully."
  else
    # https://github.com/FiloSottile/homebrew-musl-cross
    echo "musl-gcc is not detected, attempting symlink workaround..."
    DIR="/usr/local/opt/musl-cross/bin/x86_64-linux-musl-gcc"
    TARG="/usr/local/bin/musl-gcc"
    if ln -s "$DIR" "$TARG"; then
      echo "Symlink created successfully."
    else
      log_error "Symlink creation failed."
    fi
  fi
else
  log_error "Your OS '$OSTYPE' is not supported by this script. $CALL_TO_ACTION_LOL"
fi

export CC_x86_64_unknown_linux_gnu=x86_64-unknown-linux-gnu-gcc
export CXX_x86_64_unknown_linux_gnu=x86_64-unknown-linux-gnu-g++
export AR_x86_64_unknown_linux_gnu=x86_64-unknown-linux-gnu-ar
export CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=x86_64-unknown-linux-gnu-gcc

cargo build --package stump_server --release \
  --target x86_64-apple-darwin \
  --target aarch64-apple-darwin \
  --target x86_64-unknown-linux-gnu \
  --target x86_64-unknown-linux-musl \
  --target x86_64-pc-windows-gnu
