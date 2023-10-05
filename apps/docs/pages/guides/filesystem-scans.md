# Scanning

A scan is the process of indexing your filesystem to detect new media files and file changes/updates. Scans are essential for keeping your media libraries up-to-date in Stump.

You can start scans at either the library level or the series level, which are referred to as `library_scan` and `series_scan`, respectively, throughout Stump. There are no real differences between the two, except that a library scan will scan all series in the library, while a series scan will only scan the selected series.

## Quick scan vs default scan

In Stump, there is the concept of a quick scan and a default scan. A quick scan, as the name suggests, is a faster scan that utilizes more concurrency and parallelism to scan your filesystem. A quick scan waits until the _very_ end to insert what changes it has detected into the database, all in one batch.

A default scan, on the other hand, is a slightly slower scan that utilizes less concurrency and parallelism to achieve a more consistent and stable scan. Changes are inserted into the database as soon as they are detected, which means that you can access new media files as soon as they are scanned.

### Which one should I use?

To preface, both options are safe and fast, they just differ in how they operate.

The benefit of a quick scan is that it is generally faster than the default. However, because it does one big batch insert at the end, you have the following caveats:

- You cannot access any new media files until the _entire_ scan is complete
- If any one of the database inserts fails, for example bad metadata being present in a media file, then the entire scan effectively fails

Therefore, it is recommended to use a quick scan when:

- You are running consecutive scans, i.e. not the very first scan
- Your library is not very large and the scan would complete in a reasonable amount of time

Of course, if you are confident that your media files are in good shape and will not cause any issues, you are free to use whichever scan you prefer.

## Scheduling scans

You can configure the scheduler to run scans at a specific interval. This is useful for keeping your media libraries up-to-date without having to manually run scans.

To configure the scheduler, navigate to `/settings/jobs`, scroll to the `Job Scheduling` section towards the top of the page, fill out your desired interval (in seconds), and click the `Save scheduler changes` button.

For convenience, there are a few preset options you may select from the dropdown menu. These are:

- Every 6 hours (21600 seconds)
- Every 12 hours (43200 seconds)
- Every 24 hours (86400 seconds)
- Once a week (604800 seconds)
- Once a month (2592000 seconds)

> In the future, this section of the UI will change to include scheduling options for more than just scans. However, for now, it is only for scans.
