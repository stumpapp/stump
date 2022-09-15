## Package Contents

An overview of this package's contents:

- `bindings`: Auto-generated TypeScript type definitions for the Rust types.
- `prisma`: Separate package for Prisma and Prisma CLI, not bundled in releases.

### Crates

- `config`: Configuration items, such as cors, logging, etc.
- `db`: Database initialization and migration logic.
- `event`: Event manager, handles the event queue and event processing.
- `fs`: Filesystem utilities, as well as Stump's scanners.
- `guards`: Rocket guards, primarily for authentication.
- `job`: Definitions for jobs, as well as the job pool (job manager).
- `opds`: OPDS structs and feed generation.
- `routes`: Rocket routes, which are the main entry points for the API.
- `types`: Shared types, such as enums, structs, etc.
  - `models`: Database models.
- `utils`: Miscellaneous utilities
