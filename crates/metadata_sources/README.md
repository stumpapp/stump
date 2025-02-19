# Metadata Sources

A crate for managing metadata fetchers relied on by the core crate.

## Secrets

If you want to store secrets, do so in a `secrets.json` file at this crate's root. The file should not be committed (and is included in the .gitignore). Here is a template that can be copied:

```json
{
	"GOOGLE_BOOKS_API_KEY": "_",
	"HARDCOVER_API_KEY": "_",
	"COMICVINE_API_KEY": "_"
}
```
