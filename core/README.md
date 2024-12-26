# Core 🏭

The `core` crate contains Stump's core functionalities, including the database schema, models, and other shared code.

## Structure 📦

At the root of the crate, you will find a `prisma` directory, which contains the database schema and models.

The `src` directory contains the following modules:

- `config`: Configuration for the any apps consuming the core, including environment variables and tracing
- `db`: Database client, models, and utilities
- `filesystem`: Anything related to the filesystem and handling of files
  - `image`: Image processing and utilities
  - `media`: Media processing and utilities
  - `scanner`: The bulk of the indexing and scanning logic
- `job` (AGPL-3.0): Background job processing and execution
- `opds`: OPDS feed generation and XML utilities

## Database 🗄

Stump uses [Prisma](https://www.prisma.io/) as its ORM. Whenever you make changes to the database schema, you will need to re-generate your local client and then update any exported TypeScript types. To do this, you may run the following commands:

```bash
# Generate the Prisma client
cargo prisma generate --schema=./core/prisma/schema.prisma

# Export the TypeScript types
cargo codegen -- --skip-prisma

# Optionally, if a migration is needed
cargo prisma migrate dev --schema=./core/prisma/schema.prisma
```

## License 📝

This crate is licensed under the [MIT License](https://www.tldrlegal.com/license/mit-license), with the exception of the `job` module, which is licensed under the [AGPL-3.0 License](<https://www.tldrlegal.com/license/gnu-affero-general-public-license-v3-(agpl-3.0)>). The `job` module could not be possible without the work of, primarily, two other open source projects which had a significant influence on the design and implementation of the module. Therefore, I would consider it derivative work of those projects collectively:

- [Spacedrive](https://github.com/spacedriveapp/spacedrive)
- [background-jobs](https://git.asonix.dog/asonix/background-jobs)
