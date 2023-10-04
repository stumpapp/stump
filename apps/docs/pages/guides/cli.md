# Command-line interface

The Stump server ships with a built-in CLI tool that can be used for various tasks. At the time of writing, you can use it to:

- Lock or unlock a user account (i.e. prevent or allow the user to log in)
- Reset a user's password

## Usage

The CLI tool is exposed via a few subcommands using the same executable as the server, itself. To see the available subcommands, run:

```bash
./stump --help
```

This will print the various subcommands and options available to you. To see more information about a specific subcommand, run:

```bash
./stump <subcommand> --help
```

## Examples

### Locking a user account

To lock a user account, run:

```bash
./stump account lock --username <username>
```

### Unlocking a user account

To unlock a user account, run:

```bash
./stump account unlock --username <username>
```

### Resetting a user's password

To reset a user's password, run:

```bash
./stump account reset-password --username <username>
```

You will be prompted to enter a new password, with a confirmation prompt to ensure you entered it correctly. The password will be hashed and salted and stored in the database to replace the existing one.
