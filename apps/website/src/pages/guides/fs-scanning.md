# File Scanning and Analysis

With Stump, you can queue various types of jobs that do a variety of things in the background. For all jobs available, you can expect:

- live, visual progress updates
- accessible logging and reporting, including after job completion
- super speed!

This section will focus on the file scanning and analysis jobs: what they do, how they work and how to configure them.

{% callout title="Note" icon="note" %}
Currently, Stump only allows for two concurrent jobs to be running in parallel. This will eventually be a configurable option.
{% /callout %}

## ScannerJob

**Note**: this might be renamed to `LibraryScanJob`

Scanners are the primary mechanism for Stump to scan your filesystem for books. They are run in the background and are responsible for scanning the filesystem for books and populating your database with the results. The scanner for `ScannerJob` is mainly responsible for:

- series and book discovery
- series and book error detection (e.g. missing files, relocated files, etc)

During the scan, metadata is extracted, when possible, from the media files. This metadata can used to override how Stump interprets and stores the files, such as book title, author, publication date, etc.

## AnalysisJob

An analysis job does a little more heavy lifting than the scanner job. It is also more configurable, and can be used to do things like:

- duplicate page detection and removal
- file conversions (e.g. `.cbr` to `.cbz`)
- downscaled thumbnail generation and caching

TODO
