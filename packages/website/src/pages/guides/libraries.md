# Libraries

There are a couple key concepts to go over regarding how Stump represents libraries:

- Libraries are really just paths on your computer that contain subdirectories representing series of books.
- A library paths _must_ be recursively unique. This means if you have a library at `/books`, you cannot have a library at `/books/comics`.

As long as a directory is accessible by Stump, and abides by the above specification, you can create a library with it. This allows for convenient configurations like network drives, etc.

## Creating a library

TODO

## Editing a library

TODO

## Deleting a library

{% callout title="Warning" icon="danger" %}
Deleting a library will remove all of the series, books, and other entities associated with the books (e.g. read progress, reading lists, etc) contained within it. Your actual files will not be deleted, but they will no longer exist in Stump.

**This action cannot be undone.**
{% /callout %}

You can delete a library from the library selection menu on the sidebar, or by navigating to the library's overview page. In either scenario, all that is required is to click the action button and select "Delete".

## Library scans

{% callout title="Note" icon="note" %}
Currently, Stump only allows for two concurrent jobs to be running in parallel. This will eventually be a configurable option.
{% /callout %}

When a library is created, Stump will automatically queue a scan job for it. This scan job will analyze the contents of the library and populate it with all of the series/books contained within it.

To manually initiate a scan job, you can click the action button library selection menu on the sidebar and select "Scan". You may also navigate to the library's overview page and click the action button and select "Scan".

For more thorough information on library scans, see the [file-system scanning](/guides/fs-scanning) guide.
