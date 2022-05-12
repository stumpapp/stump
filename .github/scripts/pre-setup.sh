#!/bin/bash

echo "Running Stump pre-setup script! This will install the necessary development tools/dependencies required to develop Stump."

which cargo &> /dev/null
if [ $? -eq 1 ]; then
        echo "Rust could not be found on your system. Please ensure the 'rustc' and 'cargo' binaries are in your \$PATH."
        exit 1
fi

which pnpm &> /dev/null
if [ $? -eq 1 ]; then
        echo "PNPM could not be found on your system. Ensure the 'pnpm' command is in your \$PATH."
        exit 1
fi

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if which apt-get &> /dev/null; then
                echo "Detected 'apt' based distro!"
                sudo apt-get -y update
                sudo apt-get -y install "pkg-config libssl-dev"
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

        echo "Pre-setup completed! Be sure to run `pnpm run setup` to finish the setup."
elif [[ "$OSTYPE" == "darwin"* ]]; then
        # TODO: determine what is needed if anything
        echo "Pre-setup completed! Be sure to run `pnpm run setup` to finish the setup."
else
        echo "Your OS '$OSTYPE' is not supported by the pre-setup script. Please consider adding support for it: https://github.com/aaronleopold/stump/issues"
        exit 1
fi