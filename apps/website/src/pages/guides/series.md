# Series

The most important takeaway from this section is that **series are just folders** inside of a library, **one level deep** only.

![A series is just a folder](/images/1folder1series.gif)

## Basic Example

Consider the following example library:

```
. /Users/aaronleopold/Documents/Stump/Demo
├── Daredevil
│   ├── Daredevil 001.cbz
│   ├── Daredevil 002.cbz
│   └── ...
└── The Amazing Spider-Man (2018)
    ├── The Amazing Spider-Man 001 (2018).cbz
    ├── The Amazing Spider-Man 002 (2018).cbz
    └── ...
```

This library has **2 series**: _Daredevil_ and _The Amazing Spider-Man (2018)_.

## Nested Folders

Let's make it a little more complicated now:

```
. /Users/aaronleopold/Documents/Stump/Demo
├── Daredevil
│   ├── Daredevil 001.cbz
│   ├── Daredevil 002.cbz
│   └── ...
├── Some Manga
│   ├── Chapter 001
│   │   ├── Book 001.zip
│   │   ├── Book 002.zip
│   │   └── ...
│   ├── Chapter 002
│   └── ...
└── The Amazing Spider-Man (2018)
    ├── The Amazing Spider-Man 001 (2018).cbz
    ├── The Amazing Spider-Man 002 (2018).cbz
    └── ...
```

Stump only recognizes **3 series** in this library: _Daredevil_, _The Amazing Spider-Man (2018)_ and _Some Manga_. Stump **does not** and, _most likely_, **will not** support separating nested folders into individual series. Past the first level directory, i.e. `Some Manga`, all media inside nested directories (e.g. `Chapter 001`, `Chapter 002`, etc) will flatten into the parent under the same series. A visual representation of this flattening for that series, after Stump scans your library, would look like:

```
Some Manga
├── Book 001.zip
├── Book 002.zip
└── ...
```

There are plans to implement a configurable option to automatically tag media files in these kinds of configurations, for example assigning `Book001.zip` and `Book002.zip` a new tag `Some Manga - Chapter 001`, however that is not yet developed.
