import { getMediaThumbnail, mediaApi } from '@stump/api'
import { AspectRatio, cx, Text, ToolTip } from '@stump/components'
import { DirectoryListingFile, Media } from '@stump/types'
import { Book, Folder } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import { useFileExplorerContext } from '../context'

type Props = {
	file: DirectoryListingFile
}
export default function FileGridItem({ file }: Props) {
	const { name, path, is_directory } = file

	const { onSelect } = useFileExplorerContext()

	const [book, setBook] = useState<Media>()

	const imageSrc = useMemo(() => (book ? getMediaThumbnail(book.id) : undefined), [book])
	const tooltipName = useMemo(() => (book ? book.metadata?.title || book.name : name), [book, name])

	/**
	 * A function that returns the fallback icon for the file
	 *
	 * @param isSupportedBook Whether or not the file is a supported book file type, i.e. cbz, zip, rar, cbr, epub, pdf
	 */
	const getFallbackIcon = (isSupportedBook: boolean) => {
		if (isSupportedBook) {
			return <Book className="h-16 w-16 text-muted" />
		} else if (is_directory) {
			return <Folder className="h-16 w-16 fill-blue-400 text-blue-400" />
		} else {
			return null
		}
	}

	/**
	 * An effect that attempts to fetch the book associated with the file, if any exists
	 */
	useEffect(() => {
		async function tryGetMedia() {
			try {
				const response = await mediaApi.getMedia({
					path,
				})
				const entity = response.data.data?.at(0)
				if (entity) {
					setBook(entity)
				}
			} catch (err) {
				console.error(err)
			}
		}

		if (!is_directory) {
			tryGetMedia()
		}
	}, [path, is_directory])

	/**
	 * A function that renders the file according to its type and whether or not it has an associated book
	 */
	const renderFile = () => {
		const bookPattern = new RegExp(/^.*\.(cbz|zip|rar|cbr|epub|pdf)$/gi)

		if (imageSrc) {
			return <img src={imageSrc} className="object-cover" />
		}

		const isSupportedBook = bookPattern.test(path)

		return (
			<div
				className={cx('flex h-full w-full items-center justify-center rounded-md', {
					'border border-edge bg-background/80': isSupportedBook,
				})}
			>
				{getFallbackIcon(isSupportedBook)}
			</div>
		)
	}

	return (
		<ToolTip content={tooltipName} align="start">
			<button
				className="group flex h-full w-32 flex-col items-center justify-center gap-y-1.5 focus:outline-none"
				onDoubleClick={() => onSelect(file)}
			>
				<div className="flex items-start justify-between">
					<div className="w-24 overflow-hidden rounded-md group-hover:bg-background-300/80 group-focus:bg-background-300">
						<AspectRatio ratio={imageSrc ? 2 / 3 : 1} className={cx('m-1', !!imageSrc)}>
							{renderFile()}
						</AspectRatio>
					</div>
				</div>

				<Text
					className="line-clamp-2 max-w-full rounded-md p-1 group-hover:bg-background-300/80 group-focus:bg-background-300"
					size="xs"
				>
					{name}
				</Text>
			</button>
		</ToolTip>
	)
}
