# Libraries

There are a couple key concepts to go over regarding how Stump represents libraries:

- Libraries are really just paths on your computer that contain subdirectories representing series of books.
- A library paths _must_ be recursively unique. This means if you have a library at `/books`, you cannot have a library at `/books/comics`.

As long as a directory is accessible by Stump, and abides by the above specification, you can create a library with it. This allows for convenient configurations like network drives, etc.

## Library patterns

There are way too many varying organizational preferences for Stump to support all of them. Instead, Stump supports two different patterns for organizing your library:

- **Collection based library**: Takes the top most folders and collapses their contents into it as a single series.
- **Series based library**: Takes the bottom most folders as individual series, effectively being the opposite of a collection based library.

### Collection based library

A collection based library is useful for libraries that have many nested folders that you'd like to be grouped by the top most folder.

Consider the following example:

Library name: `Ebooks`

```
.LIBRARY ROOT
├── Shannon, Samantha
│   └── The Priory of the Orange Tree.epub
├── Sanderson, Brandon
│   ├── Elantris.epub
│   └── Mistborn
│       ├── Mistborn 01 - The Final Empire (epub).epub
│       ├── Mistborn 02 - The Well of Ascension (epub).epub
│       └── Mistborn 03 - The Hero of Ages (epub).epub
└── J.R.R. Tolkien
    └── The Lord of the Rings
        ├── The Fellowship of the Ring.epub
        ├── The Two Towers.epub
        └── The Return of the King.epub

```

When Stump scans this library as a collection based library, it will create 3 series: _Shannon, Samantha_, _Sanderson, Brandon_ and _J.R.R. Tolkien_. The visualization of this library in Stump would look like:

```
Ebooks
├── Shannon, Samantha
│   └── The Priory of the Orange Tree.epub
├── Sanderson, Brandon
│   ├── Elantris.epub
│   ├── Mistborn 01 - The Final Empire (epub).epub
│   ├── Mistborn 02 - The Well of Ascension (epub).epub
│   └── Mistborn 03 - The Hero of Ages (epub).epub
└── J.R.R. Tolkien
    ├── The Fellowship of the Ring.epub
    ├── The Two Towers.epub
    └── The Return of the King.epub
```

For comparison, here is the same library configured as a series based library:

```
Ebooks
├── Shannon, Samantha
│   └── The Priory of the Orange Tree.epub
├── Sanderson, Brandon
│   └── Elantris.epub
├── Mistborn
│   ├── Mistborn 01 - The Final Empire (epub).epub
│   ├── Mistborn 02 - The Well of Ascension (epub).epub
│   └── Mistborn 03 - The Hero of Ages (epub).epub
└── The Lord of the Rings
    ├── The Fellowship of the Ring.epub
    ├── The Two Towers.epub
    └── The Return of the King.epub
```

### Series based library

A series based library is useful for libraries that have many nested folders that you'd like to be grouped by the bottom most folder.

Consider the following example:

Library name: `Comics`

```
.LIBRARY ROOT
├── Daredevil
│   ├── Daredevil 001.cbz
│   ├── Daredevil 002.cbz
│   └── ...
└── The Amazing Spider-Man (2018)
    ├── The Amazing Spider-Man 001 (2018).cbz
    ├── The Amazing Spider-Man 002 (2018).cbz
    └── ...
```

When Stump scans this library as a series based library, it will create 2 series: _Daredevil_ and _The Amazing Spider-Man (2018)_. The visualization of this library in Stump would look like:

```
Comics
├── Daredevil
│   ├── Daredevil 001.cbz
│   └── Daredevil 002.cbz
└── The Amazing Spider-Man (2018)
    ├── The Amazing Spider-Man 001 (2018).cbz
    └── The Amazing Spider-Man 002 (2018).cbz
```

### Which one should I use?

There is no right and wrong when it comes to configuring a library as either collection based or series based. It's all about preference. Personally, I use a collection based library for my ebooks and a series based library for my comics. I find that the collection based library works well for ebooks, as I can group them all by author (not just the standalone novels), and the series based library works well for comics, as I can group them by comic runs.

### I don't like either of these patterns

Unfortunately, Stump does not support any other patterns. If you have a library that doesn't fit either of these patterns, check out the [Library File Explorer](/guides/library-explorer) section to see if that functionality helps with your use case.

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

For more thorough information on library scans, see the [filesystem scanning](/guides/fs-scanning) guide.
