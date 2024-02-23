#!/bin/bash

SCRIPTS_DIR="${BASH_SOURCE%/*}"
source "${SCRIPTS_DIR}/lib"

_DEV_SETUP=${DEV_SETUP:=1}
_CHECK_CARGO=${CHECK_CARGO:=1}
_CHECK_NODE=${CHECK_NODE:=1}
_FORCE_INSTALL_YARN=${INSTALL_YARN:=0}

dev_setup() {
  set -ex; \
    cargo install cargo-watch; \
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
    else 
      echo "Rust requirement met!"
    fi
fi

if [ ${_CHECK_NODE} == 1 ]; then
  which node &> /dev/null
  if [ $? -eq 1 ]; then
    log_error "Node could not be found on your system. Visit https://nodejs.org/en/download/"
  else 
    echo "Node requirement met!"
  fi

  which yarn &> /dev/null
  if [ $? -eq 1 ]; then
    if [ ${_FORCE_INSTALL_YARN} == 1 ]; then
      echo "Installing yarn..."
      npm install -g yarn
    else
      echo "yarn could not be found on your system. Would you like for this script to attempt to install 'yarn'? (y/n)"

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

CALL_TO_ACTION_LOL="Please consider helping to expand support for your system: https://github.com/stumpapp/stump/issues"

# https://tauri.app/v1/guides/getting-started/prerequisites/#1-system-dependencies
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  UNSUPPORTED_DISTRO="Your distro '$(lsb_release -s -d)' is not supported by this script. $CALL_TO_ACTION_LOL"

  if which apt-get &> /dev/null; then
    sudo apt-get -y update
    sudo apt-get -y install libwebkit2gtk-4.0-dev \
      pkg-config \
      build-essential \
      curl \
      wget \
      file \
      openssl \
      libssl-dev \
      libgtk-3-dev \
      libayatana-appindicator3-dev \
      librsvg2-dev \
      libvips42
  elif which pacman &> /dev/null; then
    sudo pacman -Syu
    sudo pacman -S --needed webkit2gtk \
      base-devel \
      curl \
      wget \
      openssl \
      appmenu-gtk-module \
      gtk3 \
      libappindicator-gtk3 librsvg libvips
  elif which dnf &> /dev/null; then
    sudo dnf check-update
    sudo dnf install openssl-devel webkit2gtk4.0-devel curl wget libappindicator-gtk3 librsvg2-devel
    sudo dnf group install "C Development Tools and Libraries"
  else
    log_error $UNSUPPORTED_DISTRO
  fi

  if [ {$_DEV_SETUP} == 1 ]; then
    dev_setup
  fi

  echo "Setup completed! Run 'yarn dev:web' or 'yarn start:web' to get started."
elif [[ "$OSTYPE" == "darwin"* ]]; then
  if [ {$_DEV_SETUP} == 1 ]; then
    dev_setup
  fi
        
  echo "Setup completed! Run 'yarn dev:web' or 'yarn start:web' to get started."
else
  log_error "Your OS '$OSTYPE' is not supported by the pre-setup script. $CALL_TO_ACTION_LOL"
fi
