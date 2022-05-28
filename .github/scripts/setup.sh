#!/bin/bash

echo "Running Stump pre-setup script! This will install the necessary development tools/dependencies required to develop Stump."
echo

which cargo &> /dev/null
if [ $? -eq 1 ]; then
        echo "Rust could not be found on your system. Please ensure the 'rustc' and 'cargo' binaries are in your \$PATH."
        exit 1
else 
        echo "Rust found on your system."
fi

which node &> /dev/null
if [ $? -eq 1 ]; then
        echo "Node could not be found on your system. Please ensure the 'node'command is in your \$PATH."
        exit 1
else 
        echo "Node found on your system."
fi

echo


which pnpm &> /dev/null
if [ $? -eq 1 ]; then
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
                                        echo "pnpm could not be installed. Please ensure you have node and npm installed."
                                        can_continue=false
                                        exit 1
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
else 
        echo "pnpm found on your system."
fi

echo

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if which apt-get &> /dev/null; then
                echo "Detected 'apt' based distro!"
                sudo apt-get -y update
                sudo apt-get -y install pkg-config libssl-dev build-essential
        elif which pacman &> /dev/null; then
                echo "Detected 'pacman' based distro!"
                sudo pacman -Syu
                sudo pacman -S --needed base-devel openssl libssl-dev
        elif which dnf &> /dev/null; then
                echo "Detected 'dnf' based distro!"
                sudo dnf check-update
                sudo dnf install "openssl-devel"
                sudo dnf group install "C Development Tools and Libraries" # GCC C/C++ compilers, autoconf, automake, make, etc.,. 
        else
                echo "Your Linux distro '$(lsb_release -s -d)' is not supported by the pre-setup script. Please consider adding support for it: https://github.com/aaronleopold/stump/issues"
                exit 1
        fi

        echo "Running 'pnpm core setup':"
        echo

        cargo install cargo-watch
        pnpm run setup

        echo
        echo "Pre-setup completed! Be sure to run 'pnpm core seed' to finish the setup."
elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo
        echo "Running 'pnpm core setup':"
        echo

        cargo install cargo-watch
        pnpm run setup
                
        echo
        echo "Pre-setup completed! Be sure to run 'pnpm core seed' to finish the setup."
else
        echo "Your OS '$OSTYPE' is not supported by the pre-setup script. Please consider adding support for it: https://github.com/aaronleopold/stump/issues"
        exit 1
fi