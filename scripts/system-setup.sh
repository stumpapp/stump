#!/bin/bash

SCRIPTS_DIR="${BASH_SOURCE%/*}"
source "${SCRIPTS_DIR}/lib"

_DEV_SETUP=${DEV_SETUP:=1}
_CHECK_CARGO=${CHECK_CARGO:=1}
_CHECK_NODE=${CHECK_NODE:=1}
_CHECK_DAV1D=${CHECK_DAV1D:=0}
_FORCE_INSTALL_YARN=${INSTALL_YARN:=0}

dev_setup() {
  set -ex; \
    cargo install --locked bacon; \
    cargo install cargo-workspaces; \
    yarn run setup; \
    set +x
}

if [ "$name" == "nix-shell" ]; then
  echo "Running nix-shell"
  exit 0
fi

if [ ${_CHECK_CARGO} == 1 ]; then
  which cargo &> /dev/null
  if [ $? -ne 0 ]; then
    log_error "Rust could not be found on your system. Visit https://www.rust-lang.org/tools/install"
  fi
fi



if [ ${_CHECK_NODE} == 1 ]; then
  which node &> /dev/null
  if [ $? -eq 1 ]; then
    log_error "Node could not be found on your system. Visit https://nodejs.org/en/download/"
  fi

  which yarn &> /dev/null
  if [ $? -eq 1 ]; then
    if [ ${_FORCE_INSTALL_YARN} == 1 ]; then
      echo "Attempting to install 'yarn'..."
      npm install -g yarn
    else
      echo "Yarn could not be found on your system. Would you like for this script to attempt to install 'yarn'? (y/n)"

      can_continue=false
      until [ $can_continue = true ]; do
              read -p "Choice: " choice

              case $choice in
                y)
                  echo "Attempting to install 'yarn'..."
                  npm install -g yarn
                  if [ $? -eq 0 ]; then
                          echo "yarn installed successfully."
                          can_continue=true
                  else
                          can_continue=false
                          log_error "yarn could not be installed. Please ensure you have node and npm installed."
                  fi
                  ;;
                n)
                  echo "Skipping 'yarn' installation. Exiting."
                  can_continue=false
                  exit 1
                  ;;
                *)
                  echo "Invalid choice. Please enter 'y' or 'n'."
                  can_continue=false
                  ;;
              esac

              echo
              echo "Would you like for this script to attempt to install 'yarn'? (y/n)"
      done
    fi
  else
    echo "yarn requirement met!"
  fi
fi

ASK_FOR_CONTRIB="Please consider helping to expand support for your system: https://github.com/stumpapp/stump/issues"

# https://tauri.app/v1/guides/getting-started/prerequisites/#1-system-dependencies
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  UNSUPPORTED_DISTRO="Your distro '$(lsb_release -s -d)' is not supported by this script. $ASK_FOR_CONTRIB"

  # Note: If running ubuntu 24, see https://github.com/bambulab/BambuStudio/issues/3973#issuecomment-2085476683
  if which apt-get &> /dev/null; then
    sudo apt-get -y update
    sudo apt-get -y install \
      libwebkit2gtk-4.1-dev \
      pkg-config \
      build-essential \
      curl \
      wget \
      file \
      openssl \
      libssl-dev \
      libgtk-3-dev \
      libayatana-appindicator3-dev \
      javascriptcoregtk-4.0 \
      libxdo-dev \
      libssl-dev \
      librsvg2-dev \
      libvips42
  elif which pacman &> /dev/null; then
    sudo pacman -Syu
    sudo pacman -S --needed webkit2gtk-4.1 \
      base-devel \
      curl \
      wget \
      openssl \
      appmenu-gtk-module \
      gtk3 \
      dav1d \
      libappindicator-gtk3 librsvg libvips
  elif which dnf &> /dev/null; then
    sudo dnf check-update
    sudo dnf install webkit2gtk4.1-devel \
      openssl-devel \
      curl \
      wget \
      file \
      libappindicator-gtk3-devel \
      librsvg2-devel
    sudo dnf group install "C Development Tools and Libraries"
  else
    log_error $UNSUPPORTED_DISTRO
  fi

  if [ {$_DEV_SETUP} == 1 ]; then
    dev_setup
  fi

elif [[ "$OSTYPE" == "darwin"* ]]; then
  if ! which brew &> /dev/null; then
    log_error "Homebrew is not installed. Visit https://brew.sh/ to install Homebrew."
  fi

  HOMEBREW_NO_AUTO_UPDATE=1 brew install dav1d

  if [ {$_DEV_SETUP} == 1 ]; then
    dev_setup
  fi
else
  log_error "Your OS '$OSTYPE' is not supported by the system-setup script. $ASK_FOR_CONTRIB"
fi

if [ ${_CHECK_DAV1D} == 1 ]; then
  which dav1d &> /dev/null
  if [ $? -ne 0 ]; then
      echo "Dav1d requirement is not met. Visit https://code.videolan.org/videolan/dav1d"
  else
    curver="$(dav1d --version)"
    cutoffver="1.3.0"
    # Note: We sort -V and take the first line to get the highest version, so we need to assert that the first
    # _isn't_ the threshold version
    if [ "$(printf '%s\n' "$cutoffver" "$curver" | sort -V | head -n1)" != "$cutoffver" ]; then
      echo "Dav1d requirement met!"
    else
      echo "Dav1d requirement is not met (version must be greater than 1.3.0). Visit https://code.videolan.org/videolan/dav1d"
    fi
  fi
fi

echo "Setup completed!"

