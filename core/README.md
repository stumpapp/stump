## Package Contents

An overview of this package's contents:

- `prisma`: Separate package for Prisma and Prisma CLI, not bundled in releases.
- `integration-tests`: Integration tests for Stump.

- `config`: Configuration items, such as cors, logging, etc.
- `db`: Database initialization and migration logic.
- `event`: Event manager, handles the event queue and event processing.
- `fs`: Filesystem utilities, as well as Stump's scanners.
- `job`: Definitions for jobs, as well as the job pool (job manager).
- `types`: Shared types, such as enums, structs, etc.
  - `models`: Database models.
- `utils`: Miscellaneous utilities
