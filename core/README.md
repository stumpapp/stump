# Core

## Project Structure

I am omitting a lot of files and only focusing on the main directories, but the following is the structure of the project:

```
. /core
├── bindings
├── prisma
├── src
└── ...
```

- `bindings`: TypeScript types for the database models are defined here
- `prisma`: Separate package for Prisma and Prisma CLI, as it should not be bundled in releases. The Prisma schema lives here, which defines Stump's database models, as well as the migration SQL files.
- `src`: The source code
