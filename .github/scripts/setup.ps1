write-host "Running Stump pre-setup script! This will install the necessary development tools/dependencies required to develop Stump."

# admin privileges (unsure if needed, prolly not)

# if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
#   write-Warning "This setup needs admin permissions. Please run this file as admin."     
#   break
# }

# check if user has cargo installed
if (-NOT (Get-Command cargo -errorAction SilentlyContinue)) {
  write-Warning "Rust could not be found on your system. Please ensure the 'rustc' and 'cargo' binaries are in your \$PATH."
  write-Warning "If you don't have Rust install, visit https://www.rust-lang.org/tools/install for official instructions."
  break
} else {
  write-host "Rust found on your system."
}

# check if user has node installed
if (-NOT (Get-Command node -errorAction SilentlyContinue)) {
  write-Warning "node could not be found on your system. Ensure the 'node' command is in your \$PATH."
  break;
} else {
  write-host "node found on your system."
}

# check if user has npm installed
if (-NOT (Get-Command npm -errorAction SilentlyContinue)) {
  write-Warning "npm could not be found on your system. Ensure the 'npm' command is in your \$PATH."
  break;
} else {
  write-host "npm found on your system."
}

# check if user has pnpm installed
if (-NOT (Get-Command pnpm -errorAction SilentlyContinue)) {
  write-Warning "pnpm could not be found on your system. Ensure the 'pnpm' command is in your \$PATH."
  break;
} else {
  write-host "pnpm found on your system."
}

write-host "Attempting to install 'cargo-watch':"
cargo install cargo-watch

write-host "Running 'pnpm run setup':"
pnpm run setup

write-host "Pre-setup completed! Run 'pnpm dev:web' or 'pnpm start:web' to get started."