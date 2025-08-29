import { useSDK } from '@stump/client'
import { Text, ToolTip } from '@stump/components'
import { DirectoryListingFile } from '@stump/graphql'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { usePrefetchBook } from '@/components/book'
import { usePrefetchBooksAfterCursor } from '@/scenes/book/BooksAfterCursor'

import { useFileExplorerContext } from '../context'
import FileThumbnail, { getBook, MediaAtPath } from '../FileThumbnail'

type Props = {
	file: DirectoryListingFile
}

export default function FileGridItem({ file }: Props) {
	const { name, path, isDirectory } = file
	const { sdk } = useSDK()

	const { onSelect } = useFileExplorerContext()

	const [book, setBook] = useState<MediaAtPath>()

	const tooltipName = useMemo(() => (book ? book.resolvedName : name), [book, name])

	/**
	 * An effect that attempts to fetch the book associated with the file, if any exists.
	 * This uses the same fetcher as the thumbnail, so it should be properly cached
	 */
	useEffect(() => {
		async function tryGetMedia() {
			// Note: This should be cached, so it should be fast
			const maybeBook = await getBook(path, sdk)
			if (maybeBook) {
				setBook(maybeBook)
			}
		}

		if (!isDirectory) {
			tryGetMedia()
		}
	}, [path, isDirectory, sdk])

	const prefetchBook = usePrefetchBook()
	const prefetchBooksAfterCursor = usePrefetchBooksAfterCursor()
	const prefetch = useCallback(
		() =>
			book
				? Promise.all([prefetchBook(book.id), prefetchBooksAfterCursor(book.id)])
				: Promise.resolve(),
		[prefetchBook, prefetchBooksAfterCursor, book],
	)

	return (
		<ToolTip content={tooltipName} align="start">
			<button
				className="group flex h-full w-32 flex-col items-center justify-center gap-y-1.5 focus:outline-none"
				onDoubleClick={() => onSelect(file)}
				{...(book
					? {
							onMouseEnter: prefetch,
						}
					: {})}
			>
				<FileThumbnail
					path={path}
					isDirectory={isDirectory}
					containerClassName="group-hover:bg-background-surface-hover/80 group-focus:bg-background-surface"
					size="md"
				/>

				<Text
					className="line-clamp-2 max-w-full rounded-md p-1 group-hover:bg-background-surface-hover/80 group-focus:bg-background-surface"
					size="xs"
				>
					{name}
				</Text>
			</button>
		</ToolTip>
	)
}
