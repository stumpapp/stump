# Permissions

Users can be assigned permissions that grant (or deny) them access to various features or actions within Stump. This allows for granular and flexible control over who can do what within your server.

## Available Permissions

| Permission          | Enum Value             | Description                                                 |
| ------------------- | ---------------------- | ----------------------------------------------------------- |
| API Keys            | `ACCESS_API_KEYS`      | Allows access to read/create their own API keys             |
| KoReader Sync       | `ACCESS_KOREADER_SYNC` | Allows access to the KoReader sync integration              |
| Access Book Club    | `ACCESS_BOOK_CLUB`     | Allows access to the Book Club feature                      |
| Create Book Club    | `CREATE_BOOK_CLUB`     | Allows creating new Book Clubs                              |
| Read Emailers       | `EMAILER_READ`         | Allows access to read any emailers in the system            |
| Create Emailers     | `EMAILER_CREATE`       | Allows creating new emailers                                |
| Manage Emailers     | `EMAILER_MANAGE`       | Allows managing existing emailers                           |
| Send Email          | `EMAIL_SEND`           | Allows sending emails                                       |
| Arbitrary Email     | `EMAIL_ARBITRARY_SEND` | Allows sending emails to arbitrary addresses                |
| Access Smart List   | `ACCESS_SMART_LIST`    | Allows access to the Smart List feature                     |
| File Explorer       | `FILE_EXPLORER`        | Allows access to the File Explorer feature                  |
| Upload File         | `UPLOAD_FILE`          | Allows uploading files to a library                         |
| Download File       | `DOWNLOAD_FILE`        | Allows downloading files from a library                     |
| Create Library      | `CREATE_LIBRARY`       | Allows creating new libraries                               |
| Edit Library        | `EDIT_LIBRARY`         | Allows editing basic details about libraries                |
| Scan Library        | `SCAN_LIBRARY`         | Allows scanning libraries for new files                     |
| Manage Library      | `MANAGE_LIBRARY`       | Allows managing libraries (scan, edit, manage relations)    |
| Edit Metadata       | `EDIT_METADATA`        | Allows editing database-level metadata for media/series     |
| Write Back Metadata | `WRITE_BACK_METADATA`  | Allows writing database metadata back to files              |
| Delete Library      | `DELETE_LIBRARY`       | Allows deleting libraries                                   |
| Read Users          | `READ_USERS`           | Allows reading user information via user-specific endpoints |
| Manage Users        | `MANAGE_USERS`         | Allows managing users (create, edit, delete)                |
| Read Notifier       | `READ_NOTIFIER`        | Allows reading configured notifiers                         |
| Create Notifier     | `CREATE_NOTIFIER`      | Allows creating new notifiers                               |
| Manage Notifier     | `MANAGE_NOTIFIER`      | Allows managing existing notifiers                          |
| Delete Notifier     | `DELETE_NOTIFIER`      | Allows deleting notifiers                                   |
| Read Jobs           | `READ_JOBS`            | Allows reading job information                              |
| Manage Jobs         | `MANAGE_JOBS`          | Allows managing jobs (pause, resume, delete, cancel)        |
| Read Persisted Logs | `READ_PERSISTED_LOGS`  | Allows reading application-level logs (e.g., job logs)      |
| Read System Logs    | `READ_SYSTEM_LOGS`     | Allows reading system logs                                  |
| Manage Server       | `MANAGE_SERVER`        | Allows managing server settings and features                |
