This native expo module provides the necessary functionality to "stream" pages of media files to support offline reading of ZIP/CBZ files. This is NOT required for EPUB files, since I am just deferring to Readium.

The library will allow the primary app to request pages from a media file, similar to how I've implemented the processing in the Rust server. As images are pulled from the file, they will be dumped to the book's "unpacked" directory (even though we aren't unpacking the full file at once) so that subsequent requests for the same page can be served from disk instead of having to re-read from the archive.

I'm not quite sure yet how to best implement this in a way that works well with the image library used in the reader since it expects a URL to load images from. If an image isn't pulled yet, we need to be able to asynchronously fetch it from the streamer module, wait for it to be written to disk, then provide the local file URL to the image component.
