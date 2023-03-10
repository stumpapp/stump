#!/bin/bash

SCRIPTS_DIR="${BASH_SOURCE%/*}"
source "${SCRIPTS_DIR}/lib"

_DEV_SETUP=${DEV_SETUP:=1}
_CHECK_CARGO=${CHECK_CARGO:=1}
_CHECK_NODE=${CHECK_NODE:=1}
_FORCE_INSTALL_PNPM=${INSTALL_PNPM:=0}

dev_setup() {
  set -ex; \
    cargo install cargo-watch; \
    pnpm run setup; \
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

  which pnpm &> /dev/null
  if [ $? -eq 1 ]; then
    if [ ${_FORCE_INSTALL_PNPM} == 1 ]; then
      echo "Installing pnpm..."
      npm install -g pnpm
    else
      echo "pnpm could not be found on your system. Would you like for this script to attempt to install 'pnpm'? (y/n)"

      can_continue=false
      until [ $can_continue = true ]; do
              read -p "Choice: " choice

              case $choice in 
                y)
                  echo "Attempting to install 'pnpm'..."
                  npm install -g pnpm
                  if [ $? -eq 0 ]; then
                          echo "pnpm installed successfully."
                          can_continue=true
                  else
                          can_continue=false
                          log_error "pnpm could not be installed. Please ensure you have node and npm installed."
                  fi
                  ;;
                n)
                  echo "Skipping 'pnpm' installation. Exiting."
                  can_continue=false
                  exit 1
                  ;;
                *)
                  echo "Invalid choice. Please enter 'y' or 'n'."
                  can_continue=false
                  ;;
              esac

              echo
              echo "Would you like for this script to attempt to install 'pnpm'? (y/n)"
      done
    fi
  else 
    echo "pnpm requirement met!"
  fi
fi

CALL_TO_ACTION_LOL="Please consider helping to expand support for your system: https://github.com/aaronleopold/stump/issues"

# TODO: group these? so lines aren't so long...
# https://tauri.app/v1/guides/getting-started/prerequisites/#1-system-dependencies
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  UNSUPPORTED_DISTRO="Your distro '$(lsb_release -s -d)' is not supported by this script. $CALL_TO_ACTION_LOL"

  if which apt-get &> /dev/null; then
    sudo apt-get -y update
    sudo apt-get -y install pkg-config libssl-dev libdbus-1-dev libsoup2.4-dev libwebkit2gtk-4.0-dev curl wget libgtk-3-dev libappindicator3-dev librsvg2-dev build-essential libayatana-appindicator3-dev
  elif which pacman &> /dev/null; then
    sudo pacman -Syu
    sudo pacman -S --needed webkit2gtk base-devel curl wget openssl appmenu-gtk-module gtk3 libappindicator-gtk3 librsvg libvips
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

  echo "Setup completed! Run 'pnpm dev:web' or 'pnpm start:web' to get started."
elif [[ "$OSTYPE" == "darwin"* ]]; then
  if [ {$_DEV_SETUP} == 1 ]; then
    dev_setup
  fi
        
  echo "Setup completed! Run 'pnpm dev:web' or 'pnpm start:web' to get started."
else
  log_error "Your OS '$OSTYPE' is not supported by the pre-setup script. $CALL_TO_ACTION_LOL"
fi
