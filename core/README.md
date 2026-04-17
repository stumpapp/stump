# Core 🏭

The `core` crate contains Stump's core functionalities

## Structure 📦

The `src` directory contains the following modules:

- `config`: Configuration for the any apps consuming the core, including environment variables and tracing
- `db`: Database client, models, and utilities
- `filesystem`: Anything related to the filesystem and handling of files
  - `image`: Image processing and utilities
  - `media`: Media processing and utilities
  - `scanner`: The bulk of the indexing and scanning logic
- `job`: Background job processing and execution lifecycle helpers, Apalis-backed system
- `opds`: OPDS feed generation and XML utilities
