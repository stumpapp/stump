write-host "Running Stump pre-setup script! This will install the necessary development tools/dependencies required to develop Stump."

# admin privileges (unsure if needed, prolly not)

# if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
#   write-Warning "This setup needs admin permissions. Please run this file as admin."     
#   break
# }

# check if user has cargo installed
if (-NOT (Get-Command cargo -errorAction SilentlyContinue)) {
  write-Warning "Rust could not be found on your system. Please ensure the 'rustc' and 'cargo' binaries are in your \$PATH."
  break
}

# check if user has pnpm installed
if (-NOT (Get-Command pnpm -errorAction SilentlyContinue)) {
  write-Warning "PNPM could not be found on your system. Ensure the 'pnpm' command is in your \$PATH."
  break;
}

# TODO: check if anything else is needed

write-host "Pre-setup completed! Be sure to run 'pnpm run setup' to finish the setup."