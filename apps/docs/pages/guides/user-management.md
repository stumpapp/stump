# Users and User Accounts

Stump has two user account types:

- **Server Owner**: The owner of the server. This user has full control over the server, and can add and remove users.
- **Server Member**: A user that is granted access to the server. This user has majority read-only access to the server.

An 'unclaimed' Stump server, or a server that has no user with the `server owner` role, will prompt for an initialization step, and will automatically assign the first registered user the **Server Owner** role.

All of the user management functionality is available in the `Users` section of the settings page, which only the **Server Owner** has access to, available at `/settings/users` in your browser. The following sections will cover the various user management features.

## Creating a user

To create a new user, click the `Create user` button in the `Users` section of the settings page. This will open a modal with the following fields:

- **Username**: The username of the user. This is used to log in to the server.
- **Password**: The password of the user. This is used to log in to the server. You can click the `Generate` button to generate a random password, or manually enter one.
- **Age restriction**: The _optional_ age restriction of the user. This is used to determine which books the user can access. You may enter a number corresponding to the **maximum** age rating the user can access. For example, if you enter `13` then the user will be able to access books with an age rating of `13` or lower. See the [age restrictions](/guides/access-control#age-restrictions) section of the Access Control guide for more information.

  - **Note**: If you check the `Enforce restrictions for missing metadata` checkbox, then the user will only be able to access books that:

    1. _Explicitly_ have an age rating set
    2. The age rating is less than or equal to the user's age restriction.

    Otherwise, the user will be able to access books that _do not_ have an age rating set.

## Editing a user

> Such empty! Will be filled in the future.

## Deleting a user

> Such empty! Will be filled in the future.
