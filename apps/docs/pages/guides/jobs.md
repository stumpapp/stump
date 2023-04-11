# The Job Queue

With Stump, you can queue various types of jobs that do a variety of things in the background. For all jobs available, you can expect:

- Live, visual progress updates
- Accessible logging and reporting
- Persisted job history

## Library scans

Scanners are the primary mechanism for how Stump has your media to interact with. They are run in the background, and are responsible for indexing the filesystem for books and populating your database with the results. The scanner for `LibraryScanJob` supports the following:

- series and book discovery
- series and book error detection (e.g. missing files)
- file conversions (e.g. `.cbr`/`rar` to `.cbz`/`zip`)
- downscaled thumbnail generation and caching

During the scan, metadata is extracted, when possible, from the media files. This metadata can used to override how Stump interprets and stores the files, such as book title, author, publication date, etc.

### Scan modes

There are two modes of scanning that Stump supports:

- **Sync Scan**: Inserts new series and media into the database one at a time, as they are discovered. Stump clients will be notified of the changes as they are made.
- **Batched Scan**: Inserts new series and media into the database in batches. Stump clients will be notified of the changes once the entire batch has been processed. _This is significantly faster than a sync scan_, and is the default mode of scanning.

Batched scans are the default mode of scanning and _highly_ recommended in the vast majority of cases. The only time you should consider using a sync scan is if you would like to read a book as soon as it is discovered, and you are not willing to wait for the entire scan to complete. In most cases however, the batch scan will be so much quicker that the wait will be negligible.

### Scan options

Majority of the options for `LibraryScanJob` are related to the library configuration, itself. These options are (all of which will apply to all books in the library):

- **Thumbnail generation**: Whether or not to generate lower resolution, WEBP thumbnails.
- **File conversion**: Whether or not to convert files to a different format.
  - Note: This will create a WEBP file at 0.75 scale. In the future, this will be more configurable, having options for format and quality.
- **File removals**: Whether or not to delete files that were previously converted.

### Ignoring files

Stump will support a `.stumpignore` file in the future, which will allow you to ignore certain files and directories from being scanned. This is useful for files which are organized with your media, but you don't want to be included in the library.

Some examples you can achieve with this:

```bash
# Ignore all files in the "extras" directory
extras/
# Ignore all files in the "extras" directory, except for "extras/include-me.cbz"
!extras/include-me.cbz
```

Please note, that in the above example, if you exclude an entire directory and explicitly include a file in that directory, a series will still potentially be created for that directory depending on which [library pattern](/guides/libraries#library-patterns) you have configured. If it does get created, `include-me.cbz` will be the only file in the series.
