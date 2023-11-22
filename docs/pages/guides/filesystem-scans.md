# Scanning

A scan is the process of indexing your filesystem to detect new media files and file changes/updates. Scans are essential for keeping your media libraries up-to-date in Stump.

You can start scans at either the library level or the series level, which are referred to as `library_scan` and `series_scan`, respectively, throughout Stump. There are no real differences between the two, except that a library scan will scan all series in the library, while a series scan will only scan the selected series.

## How does it work?

When you start a scan, Stump will walk your filesystem to detect any new, updated, or otherwise changed series and media. It will then insert these changes into the database, which will make them available to you in the UI.

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
