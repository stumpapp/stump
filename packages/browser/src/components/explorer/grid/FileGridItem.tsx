import { Text, ToolTip } from '@stump/components'
import { DirectoryListingFile, Media } from '@stump/types'
import React, { useEffect, useMemo, useState } from 'react'

import { useFileExplorerContext } from '../context'
import FileThumbnail, { getBook } from '../FileThumbnail'

type Props = {
	file: DirectoryListingFile
}

export default function FileGridItem({ file }: Props) {
	const { name, path, is_directory } = file

	const { onSelect } = useFileExplorerContext()

	const [book, setBook] = useState<Media>()

	const tooltipName = useMemo(() => (book ? book.metadata?.title || book.name : name), [book, name])

	/**
	 * An effect that attempts to fetch the book associated with the file, if any exists.
	 * This uses the same fetcher as the thumbnail, so it should be properly cached
	 */
	useEffect(() => {
		async function tryGetMedia() {
			// Note: This should be cached, so it should be fast
			const maybeBook = await getBook(path)
			if (maybeBook) {
				setBook(maybeBook)
			}
		}

		if (!is_directory) {
			tryGetMedia()
		}
	}, [path, is_directory])

	return (
		<ToolTip content={tooltipName} align="start">
			<button
				className="group flex h-full w-32 flex-col items-center justify-center gap-y-1.5 focus:outline-none"
				onDoubleClick={() => onSelect(file)}
			>
				<FileThumbnail
					path={path}
					isDirectory={is_directory}
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
