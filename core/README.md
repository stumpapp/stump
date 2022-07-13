# Core

## Project Structure

I am omitting a lot of files and only focusing on the main directories, but the following is the structure of the project:

```
. /core
├── bindings
├── prisma
├── prisma-cli
├── src
└── ...
```

- `bindings`: TypeScript types for the database entities are defined here
- `prisma`: The prisma schema lives here, which defines my database models
- `prisma-cli`: Separate package for Prisma CLI, as it should not be bundled in releases
- `src`: The source code
