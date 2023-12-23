import { getMediaThumbnail, mediaApi } from '@stump/api'
import { AspectRatio, cx, Text, ToolTip } from '@stump/components'
import type { DirectoryListingFile, Media } from '@stump/types'
import { Book, Folder } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import GenericEmptyState from '@/components/GenericEmptyState'

import { useFileExplorerContext } from './context'

type FileExplorerProps = {
	files: DirectoryListingFile[]
}

// TODO: this needs to be virtualized, as I am not paginating it like other lists/grids throughout Stump.
// Look into -> https://tanstack.com/virtual/v3, doesn't look too bad
export default function FileExplorer({ files }: FileExplorerProps) {
	if (!files.length) {
		return (
			<div className="flex h-full w-full items-center justify-center px-4">
				<GenericEmptyState title="No files" subtitle="This folder is empty" />
			</div>
		)
	}

	return (
		<div className="grid grid-cols-4 items-start justify-center gap-6 px-4 py-2 sm:grid-cols-5 md:grid-cols-7 md:justify-start lg:grid-cols-9">
			{files.map((file) => (
				<ExplorerFile key={file.path} {...file} />
			))}
		</div>
	)
}

// Lol the name is just reversed...
function ExplorerFile(file: DirectoryListingFile) {
	const { onSelect } = useFileExplorerContext()

	const { name, path, is_directory } = file

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
			return <Book className="h-16 w-16 text-gray-750 dark:text-gray-400" />
		} else if (is_directory) {
			return <Folder className="h-16 w-16 fill-blue-400 text-blue-400 dark:text-blue-400" />
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
					'border border-gray-75 bg-gray-50/80 dark:border-gray-950 dark:bg-gray-1000/30':
						isSupportedBook,
				})}
			>
				{getFallbackIcon(isSupportedBook)}
			</div>
		)
	}

	return (
		<ToolTip content={tooltipName} align="start">
			<button
				className="group flex h-full w-full flex-col items-center justify-center gap-y-1.5 focus:outline-none"
				onDoubleClick={() => onSelect(file)}
			>
				<div className="flex items-start justify-between">
					<div className="w-24 overflow-hidden rounded-md group-hover:bg-gray-75/75 group-focus:bg-gray-100/75 dark:group-hover:bg-gray-900/75 dark:group-focus:bg-gray-850/75">
						<AspectRatio ratio={imageSrc ? 2 / 3 : 1} className={cx('m-1', !!imageSrc)}>
							{renderFile()}
						</AspectRatio>
					</div>
				</div>

				<Text
					className="line-clamp-1 max-w-full rounded-md p-1 group-hover:bg-gray-75/75 group-focus:bg-gray-100/75 dark:group-hover:bg-gray-900/75 dark:group-focus:bg-gray-850/75"
					size="xs"
				>
					{name}
				</Text>
			</button>
		</ToolTip>
	)
}
