# Libraries

There are a couple key concepts to go over regarding how Stump represents libraries:

- Libraries are really just paths on your computer that contain subdirectories representing series of books.
- A library paths _must_ be recursively unique. This means if you have a library at `/books`, you cannot have a library at `/books/comics`.

As long as a directory is accessible by Stump, and abides by the above specification, you can create a library with it. This allows for convenient configurations like network drives, etc.

## Library patterns

There are way too many varying organizational preferences for Stump to support all of them. Instead, Stump supports two different patterns for organizing your library:

- **Collection-Priority Library**: Takes the top most folders and collapses their contents into it as a single series.
- **Series-Priority Library**: Will create a separate series for each folder that directly contains media files, not just the top most folder.

### Collection-Priority Library

A collection-priority library is useful for libraries that have many nested folders that you'd like to be grouped by the top most folder. **Only direct descendants of the library root will be considered for series creation**, so long as they contain media files at some point in their hierarchy.

### Series-Priority Library

A series-priority library is useful for libraries which should be grouped by any directory that directly contains media files. **Any descendant directories (including the library root itself) will be considered for series creation**, so long as they directly contain media files.

### Examples

A few examples to help illustrate the difference between the two library patterns and how Stump will interpret their differing structures.

#### Example 1

Consider the following example:

Library name: `Ebooks`

```
.LIBRARY ROOT FOLDER
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

When Stump scans this library as a collection-priority library, it will create 3 series: _Shannon, Samantha_, _Sanderson, Brandon_ and _J.R.R. Tolkien_. The visualization of this library in Stump would look like:

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

For comparison, here is the same library configured as a series-priority library:

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

#### Example 2

Consider the following example:

Library name: `Comics`

```
.LIBRARY ROOT FOLDER
├── Daredevil
│   ├── Daredevil 001.cbz
│   ├── Daredevil 002.cbz
│   └── ...
└── The Amazing Spider-Man (2018)
    ├── The Amazing Spider-Man 001 (2018).cbz
    ├── The Amazing Spider-Man 002 (2018).cbz
    └── ...
```

When Stump scans this library as a series-priority library, it will create 2 series: _Daredevil_ and _The Amazing Spider-Man (2018)_. The visualization of this library in Stump would look like:

```
Comics
├── Daredevil
│   ├── Daredevil 001.cbz
│   └── Daredevil 002.cbz
└── The Amazing Spider-Man (2018)
    ├── The Amazing Spider-Man 001 (2018).cbz
    └── The Amazing Spider-Man 002 (2018).cbz
```

#### Complicated Example

Let's consider the following filesystem for a library:

```
.LIBRARY ROOT FOLDER
├── Martin, George R R
│   └── A Song of Ice and Fire
│       ├── A Dance With Dragons (2012).epub
│       ├── A Feast for Crows (2005).epub
│       ├── A Game of Thrones (2011).epub
│       ├── A Storm of Swords (2003).epub
│       └── Fire and Blood (2018).epub
├── Sanderson, Brandon
│   ├── Elantris.epub
│   └── The Mistborn
│       ├── Secret History.epub
│       ├── The Mistborn (Era 1)
│       │   ├── Mistborn 01 - The Final Empire (epub).epub
│       │   ├── Mistborn 02 - The Well of Ascension (epub).epub
│       │   └── Mistborn 03 - The Hero of Ages (epub).epub
│       └── The Mistborn (Era 2)
│           ├── Mistborn 04 - The Alloy of Law (epub).epub
│           ├── Mistborn 05 - Shadows of Self (epub).epub
│           └── Mistborn 06 - The Bands of Mourning (epub).epub
└── Tolkien, J R R
    ├── Hobbit Or There and Back Again (1986).epub
    └── The Lord of the Rings
        ├── The Fellowship of the Ring.epub
        ├── The Two Towers.epub
        └── The Return of the King.epub
```

Notice how I started mixing stand alone novels and book series, grouping the book series by folders, for each author. With a collection-priority library, the way this is represented in Stump is rather straight forward:

```
Ebooks
├── Martin, George R R
│   ├── A Dance With Dragons (2012).epub
│   ├── A Feast for Crows (2005).epub
│   ├── A Game of Thrones (2011).epub
│   ├── A Storm of Swords (2003).epub
│   └── Fire and Blood (2018).epub
├── Sanderson, Brandon
│   ├── Elantris.epub
│   ├── Mistborn 01 - The Final Empire (epub).epub
│   ├── Mistborn 02 - The Well of Ascension (epub).epub
│   ├── Mistborn 03 - The Hero of Ages (epub).epub
│   ├── Mistborn 04 - The Alloy of Law (epub).epub
│   ├── Mistborn 05 - Shadows of Self (epub).epub
│   ├── Mistborn 06 - The Bands of Mourning (epub).epub
│   └── Secret History.epub
└── Tolkien, J R R
    ├── Hobbit Or There and Back Again (1986).epub
    ├── The Fellowship of the Ring.epub
    ├── The Two Towers.epub
    └── The Return of the King.epub
```

Everything still collapses nicely under a single series per author. However, look at how Stump will interpret this library when we use a series-priority library:

```
Ebooks
├── A Song of Ice and Fire
│   ├── A Dance With Dragons (2012).epub
│   ├── A Feast for Crows (2005).epub
│   ├── A Game of Thrones (2011).epub
│   ├── A Storm of Swords (2003).epub
│   └── Fire and Blood (2018).epub
├── Sanderson, Brandon
│   └── Elantris.epub
├── The Mistborn
│   └──  Secret History.epub
├── The Mistborn (Era 1)
│   ├── Mistborn 01 - The Final Empire (epub).epub
│   ├── Mistborn 02 - The Well of Ascension (epub).epub
│   └── Mistborn 03 - The Hero of Ages (epub).epub
├── The Mistborn (Era 2)
│   ├── Mistborn 04 - The Alloy of Law (epub).epub
│   ├── Mistborn 05 - Shadows of Self (epub).epub
│   └── Mistborn 06 - The Bands of Mourning (epub).epub
├── Tolkien, J R R
│   └── Hobbit Or There and Back Again (1986).epub
└── The Lord of the Rings
    ├── The Fellowship of the Ring.epub
    ├── The Two Towers.epub
    └── The Return of the King.epub
```

With a series-priority library, we end up with 7 series, instead of 3. This is because Stump will create a series for each folder that contains books, relative to the deepest most directory. If you have nested folders in a series-priority library, Stump will continue to create series for each parent folder containing media files.

For example, look at the `Tolkien, J R R` folder from the filesystem graphic in the begininning of this example. You can see inside `Tolkien, J R R`, the deepest directory is `The Lord of the Rings`. Stump will create a series for that folder and add the three books inside it. Afterwards, there is still a media file in the `Tolkien, J R R` folder, so Stump will create a separate series for that folder and add the `Hobbit Or There and Back Again (1986).epub` book to it.

### Choosing a Pattern

There is no right and wrong when it comes to configuring a library as either collection-priority or series-priority. It's all about preference.

In general, if you plan on having nested folders in your library that can be grouped by the upper most level, then you should use a collection-priority library. If your library is flat, or you don't want to group books by the upper most level, then you should use a series-priority library.

Personally, I use a collection-priority library for my ebooks and a series-priority library for my comics. I find that the collection-priority library works well for ebooks, as I can group them all by author, regardless of how I organize the underlying filesystem, and the series-priority library works well for comics, as I can group them by major arcs.

#### Alternative Options

Unfortunately, Stump does not support any other patterns, as there are simply too many ways to organize a library to support them all. If you have a library that doesn't quite fit either of these patterns, or you just prefer a differnt organization method, you can always use the [Library File Explorer](/guides/library-explorer) to navigate your library. This is akin to using a native file explorer to navigate your filesystem.

## Creating a Library

TODO

## Editing a Library

TODO

## Deleting a Library

> Deleting a library will remove all of the series, books, and other entities associated with the books (e.g. read progress, reading lists, etc) contained within it. Your actual files will not be deleted, but they will no longer exist in Stump.
>
> **This action cannot be undone.**

You can delete a library from the library selection menu on the sidebar, or by navigating to the library's overview page. In either scenario, all that is required is to click the action button and select "Delete".

## Populating your Library

By default, Stump will automatically queue a scan for newly created libraries. A scan will index your filesystem, relative to the library's configured base path, and sync discovered media information with Stump's database.

To manually initiate a scan job, you can click the action button library selection menu on the sidebar and select "Scan". You may also navigate to the library's overview page and click the action button and select "Scan".

For more thorough information on library scans, see the [filesystem scanning](/guides/filesystem-scans) guide.
