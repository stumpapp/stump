# Books

The backbone of Stump! There are a couple key concepts to go over regarding how Stump represents books:

- Books (also internally referred to as `media`) primarily refer to files on disk
- Books are grouped into [`series`](/guides/basics/series), which are then grouped into [`libraries`](/guides/basics/libraries)
- [Metadata](#metadata) is an associated set of information _about_ a book, such as its title, author, etc.

## Supported formats

The following table outlines the supported formats for books in Stump:

| Format      | Extension(s)  | Basic | Streaming | OPDS | Notes                                                                                                                                                                                                                                                                                                      |
| ----------- | ------------- | ----- | --------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ZIP Archive | `.cbz` `.zip` | ✅    | ✅        | ✅   |                                                                                                                                                                                                                                                                                                            |
| RAR Archive | `.cbr` `.rar` | ✅    | ✅        | ✅   |                                                                                                                                                                                                                                                                                                            |
| EPUB        | `.epub`       | ✅    | ❌        | ✅   | Epub files aren't generally supported by OPDS-PSE (streaming) unless they are image-only. They are otherwise OPDS-compatible                                                                                                                                                                               |
| PDF         | `.pdf`        | ✅    | ✅        | ✅   | [PDFium](https://pdfium.googlesource.com/pdfium/) is used for PDF-to-image rendering. Outside of Docker, you will have to provide Stump the location of your PDFium binary in order for PDF rendering to work. See [configuration](/guides/configuration/server-options#pdfium_path) for more information. |

- **Basic**: Basic support encapsulates the minimally viable functionality for a given format. In general, this will include things like:
  - File discovery
  - Metadata extraction
  - File serving
- **Streaming**: Streaming support refers to the ability to stream a book's pages _individually_ to a client. This is generally important, as it reduces overall network loads by only sending the pages that are being requested by the client. If a format does not support streaming, the entire book will be sent to the client at once when it is requested.
  - Epub files are sort of an exception to this, as they are essentially an archive of HTML/CSS files. The HTML files for each chapter can currently be streamed individually, however the UI does not utilize this yet.
- **OPDS**: OPDS support refers to the ability to serve a book according to OPDS. For more information, see the [OPDS](/guides/opds) guide.

### Image formats

Stump aims to have broad support for images within books. The following image formats are explicitly supported:

- JPEG
- [PNG](https://caniuse.com/png)
- [WebP](https://caniuse.com/webp)
- [GIF](https://caniuse.com/gif)
- [JXL](https://caniuse.com/jxl)
- [AVIF](https://caniuse.com/avif)
- [HEIF](https://caniuse.com/heif)

You should ensure that your browser supports the format you plan to use. You can visit the hyperlinked URLs to check.

## Metadata

Metadata is an associated set of information _about_ a book, such as its title, author, etc. Different formats have different ways of storing and representing metadata. Stump will attempt to extract as much metadata as possible from a given book, however it is not always possible. For example, PDF files do not generally have very good metadata support, and comic book files (e.g., CBZ/CBR) often times have very malformed metadata.

### Sources per format

The following outlines the sources of metadata for each format:

#### CBZ/CBR/RAR/ZIP

Archive formats, aside from EPUB files, are primarily assumed to be comic books. As such, metadata is extracted from a file named `ComicInfo.xml` if it exists. Currently, Stump follows the [v2.0 schema](https://anansi-project.github.io/docs/comicinfo/schemas/v2.0) for parsing. There is some leeway for malformed XML that Stump will try to catch, but it is not guaranteed to work. Please ensure your `ComicInfo.xml` is valid XML.

#### EPUB

EPUB files typically store their metadata in an `OPF` file, but it is more limited than what can be found in a typical `ComicInfo.xml` file. Stump will prioritize any metadata found in an `OPF` file matching the name of the EPUB in the same directory.

#### PDF

PDF files do not generally have very good metadata support. In general, I have seen only a few fields that are consistently populated, such as the title and author.

### Additional sources

Stump will also attempt to extract series metadata from a `series.json` file at the root of a series directory. This is not specific to any format or books in general, though, so refer to the [series](/guides/series) guide for more information.

### Special metadata fields

There are a few special metadata fields that Stump will use for additional functionality:

#### Age rating

The age rating field can be used in-conjunction with [access controls](/guides/access-control) to restrict access to books based on their age rating. There are a **LOT** of different age rating systems, and Stump does not currently support all of them, so be sure to review the [age restriction](/guides/access-control#age-restrictions) section for more information.

## Sorting

Stump does not support natural sorting at this time. It is [being investigated](https://github.com/stumpapp/stump/issues/733) for a future release, though. This means that you should ensure to pad your numbers with leading zeros (e.g., `001`, `010`, etc) when naming your files. The general rule of thumb is to pad the numbers enough so that they are all the same length (e.g., `001`, `002`, `010`, `100`, etc) within an entire series. So if a series goes into the 1000s, you should pad the numbers to at least four digits (e.g., `0001`, `0010`, `0100`, `1000`, etc).
