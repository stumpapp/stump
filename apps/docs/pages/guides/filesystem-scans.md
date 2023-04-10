# Scanning

Scanning is essential for keeping your media libraries up-to-date in Stump. Scanners will index your filesystem based on the configured libraries to detect new media files and file changes/updates, which are then synced with Stump's database.

You can start scans at either the library level or the series level, which are referred to as library scan and series scan respectively throughout Stump. There are no real differences between the two, except that a library scan will scan all series in the library, while a series scan will only scan the selected series.

## Scan Modes

You can choose between two scanning modes: in-order and parallel scanning.

### In-order scanning

In-order scanning processes one series at a time and inserts its media one-by-one as soon as they are discovered. This means that you can access new media files as soon as they are scanned, even if the rest of the series has not been scanned yet.

### Parallel scanning

Parallel scanning processes multiple series at once, up to 10 series in a batch. This significantly reduces the overall scanning time, but you may not be able to access some media files until the entire batch is processed.

### Example

Let's assume you are about to add a new library to Stump. In it contains 200 series, each containing about 50 books.

An in-order scan will start from the first series and insert all of its media one at a time before moving on to the next series. On the other hand, a parallel scan will divide the 200 series into two chunks of 100 series and process up to 10 series in parallel for each chunk before inserting all the media in a single batch per chunk.

It is generally recommend to use parallel scanning whenever possible because it is more efficient and faster than in-order scanning.

## Scheduled Scans

By default, Stump schedules regular automated scans of your library folders. However, you can update or disable this functionality in the server configuration section. For more information, please refer to the [relevant documentation](#).
