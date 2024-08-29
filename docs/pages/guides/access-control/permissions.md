# Permissions

Users can be assigned permissions that grant (or deny) them access to various features or actions within Stump. This allows for granular and flexible control over who can do what within your server.

## Available Permissions

| Permission        | Shorthand              | Description                                  | Associated/Included Permissions                      |
| ----------------- | ---------------------- | -------------------------------------------- | ---------------------------------------------------- |
| Access Book Club  | `bookclub:read`        | Allows access to the Book Club feature       |                                                      |
| Create Book Club  | `bookclub:create`      | Allows creating new Book Clubs               | `bookclub:read`                                      |
| Access Smart List | `smartlist:read`       | Allows access to all Smart List features     |                                                      |
| Read Emailers     | `emailer:read`         | Allows access read configured emailers       | `email:send`                                         |
| Create Emailers   | `emailer:create`       | Allows creating new emailers                 | `emailer:read`                                       |
| Manage Emailers   | `emailer:manage`       | Allows managing existing emailers            | `emailer:read`                                       |
| Send Email        | `email:send`           | Allows sending emails to known emails        | `emailer:read`                                       |
| Arbitrary Email   | `email:arbitrary_send` | Allows sending emails to arbitrary emails    | `emailer:read`                                       |
| File Explorer     | `file:explorer`        | Allows access to the File Explorer feature   |                                                      |
| File Upload       | `file:upload`          | Allows uploading files to the server         |                                                      |
| File Download     | `file:download`        | Allows downloading files from the server     |                                                      |
| Read Notifiers    | `notifier:read`        | Allows access to read configured notifiers   |                                                      |
| Create Notifiers  | `notifier:create`      | Allows creating new notifiers                | `notifier:read`                                      |
| Delete Notifiers  | `notifier:delete`      | Allows deleting notifiers                    | `notifier:read`                                      |
| Manage Notifiers  | `notifier:manage`      | Allows managing existing notifiers           | `notifier:read`, `notifier:create`,`notifier:delete` |
| Create Library    | `library:create`       | Allows creating new libraries                |                                                      |
| Edit Library      | `library:edit`         | Allows editing basic details of libraries    |                                                      |
| Scan Library      | `library:scan`         | Allows scanning libraries for new content    |                                                      |
| Manage Library    | `library:manage`       | Allows managing the contents of libraries    | `library:edit`, `library:scan`                       |
| Delete Library    | `library:delete`       | Allows deleting libraries                    | `library:manage`                                     |
| Manage Users      | `user:manage`          | Allows managing users and their permissions  |                                                      |
| Manage Server     | `server:manage`        | Allows managing server settings and features | `user:manage`, `library:manage`                      |
