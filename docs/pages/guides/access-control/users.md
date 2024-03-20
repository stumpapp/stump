# Users and User Accounts

Stump has two user account types:

- **Server Owner**: The owner of the server. This user has full control over the server, and can add and remove users.
- **Server Member**: A user that is granted access to the server. This user has majority read-only access to the server, with opt-out options

An 'unclaimed' Stump server, or a server that has no user with the `server owner` role, will prompt for an initialization step, and will automatically assign the first registered user the **Server Owner** role.

## Managing Users

### Creating a user

To create a new user, click the `Create user` button in the `Users` section of the settings page. This will open a modal with the following fields:

- **Username**: The username of the user. This is used to log in to the server.
- **Password**: The password of the user. This is used to log in to the server. You can click the `Generate` button to generate a random password, or manually enter one.
- **Age restriction**: The _optional_ age restriction of the user. This is used to determine which books the user can access. You may enter a number corresponding to the **maximum** age rating the user can access. For example, if you enter `13` then the user will be able to access books with an age rating of `13` or lower. See the [age restrictions](/guides/access-control#age-restrictions) section of the Access Control guide for more information.

  - **Note**: If you check the `Enforce restrictions for missing metadata` checkbox, then the user will only be able to access books that:

    1. _Explicitly_ have an age rating set
    2. The age rating is less than or equal to the user's age restriction.

    Otherwise, the user will be able to access books that _do not_ have an age rating set.

### Editing a user

> Such empty! Will be filled in the future.

### Deleting a user

To delete a user, navigate to `/settings/users` in your browser. Locate the `Users` table and click the action menu button (three dots) for the user you wish to delete. Click the `Delete` button in the action menu. This will open a modal asking you to confirm the deletion. Click the `Delete` button in the modal to confirm the deletion.

## Security

Stump currently does not enforce any password complexity requirements. This can change if there is enough demand for it. In general, Stump follows a fairly standard security model:

- Stored passwords are hashed and salted
- All ASCII/Unicode characters are allowed
- There are no knowledge-based authentication (KBA) recovery options, such as “What was the name of your first pet?”
- Users are allowed 10 failed password attempts before being locked out completely (until an administrator unlocks the account)

### Account locking and unlocking

If a user has been locked out of their account, it is up to the server owner to unlock the account to restore access. This can be done using either of the following methods:

1. Navigate to `/settings/users` in your browser. Locate the `Users` table and click the action menu button (three dots) for the user you wish to unlock. Click the `Unlock` button in the action menu. This will open a modal asking you to confirm the unlock. Click the `Unlock` button in the modal to confirm the unlock.
2. Use the embedded CLI in the Stump server to unlock the user account. See the [CLI](/guides/cli) guide for more information. In general, the command will look like this:

   ```bash
   ./stump account unlock --username <username>
   ```

   Similarly, you can lock a user account using the following command:

   ```bash
    ./stump account lock --username <username>
   ```

In the event the server owner account becomes locked, you will only be able to unlock it using the CLI.

### Password reset

If a user has forgotten their password, you will have to use the embedded CLI in the Stump server to reset the user's password. See the [CLI](/guides/cli) guide for more information. In general, the command will look like this:

```bash
./stump account reset-password --username <username>
```

It will prompt you for a new password with confirmation. Once the password has been reset, the user will be able to log in with the new password.
