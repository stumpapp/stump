import { UseDirectoryListingFile, useSDK } from '@stump/client'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { usePrefetchBook } from '@/components/book'
import { usePrefetchBooksAfterCursor } from '@/scenes/book/BooksAfterCursor'

import { useFileExplorerContext } from '../context'
import FileThumbnail, { getBook, MediaAtPath } from '../FileThumbnail'

type Props = {
	file: UseDirectoryListingFile
}

export default function FileGridItem({ file }: Props) {
	const { name, path, isDirectory } = file
	const { sdk } = useSDK()

	const { onSelect } = useFileExplorerContext()

	const [book, setBook] = useState<MediaAtPath>()

	const tooltipName = useMemo(() => (book ? book.resolvedName : name), [book, name])

	useEffect(() => {
		async function tryGetMedia() {
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
		<button
			title={tooltipName}
			className="group w-30 gap-2 p-1 flex cursor-default flex-col items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			onDoubleClick={() => onSelect(file)}
			{...(book ? { onMouseEnter: prefetch } : {})}
		>
			<div className="p-2 flex w-full items-center justify-center rounded-lg transition-colors group-hover:bg-muted">
				<FileThumbnail path={path} isDirectory={isDirectory} thumbSize={72} />
			</div>

			<span className="px-2 py-0.5 text-sm line-clamp-2 max-w-full rounded-md text-center text-foreground/80 transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
				{name}
			</span>
		</button>
	)
}
