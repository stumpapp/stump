import { getMediaThumbnail, mediaApi } from '@stump/api'
import { Button, cx, Text } from '@stump/components'
import type { DirectoryListingFile } from '@stump/types'
import { useEffect, useState } from 'react'

import { useFileExplorerContext } from './context'
import FileExplorerHeader from './FileExplorerHeader'

interface FileExplorerProps {
	files: DirectoryListingFile[]
}

// TODO: this needs to be virtualized, as I am not paginating it like other lists/grids throughout Stump.
// Look into -> https://tanstack.com/virtual/v3, doesn't look too bad
// TODO: this needs to have grid and list layout options
export default function FileExplorer({ files }: FileExplorerProps) {
	return (
		<>
			<FileExplorerHeader />
			<div className="grid grid-cols-4 items-start justify-center gap-6 sm:grid-cols-5 md:grid-cols-7 md:justify-start lg:grid-cols-9">
				{files.map((file) => (
					<ExplorerFile key={file.path} {...file} />
				))}
			</div>
		</>
	)
}

// Lol the name is just reversed...
function ExplorerFile(file: DirectoryListingFile) {
	const { onSelect } = useFileExplorerContext()

	const { name, path, is_directory } = file
	const [iconSrc, setIconSrc] = useState<string>()

	function getIconSrc() {
		const archivePattern = new RegExp(/^.*\.(cbz|zip|rar|cbr)$/gi)

		if (is_directory) {
			return '/assets/icons/folder.png'
		} else if (archivePattern.test(path)) {
			// TODO: no lol, I want to try and render a small preview still
			// will have to create a new endpoint to try and grab a thumbnail by path
			return '/assets/icons/archive.svg'
		} else if (path.endsWith('.epub')) {
			return '/assets/icons/epub.svg'
		} else {
			return ''
		}
	}

	useEffect(() => {
		async function tryGetMedia() {
			try {
				const response = await mediaApi.getMedia({
					path,
				})
				const entity = response.data.data?.at(0)
				if (entity) {
					setIconSrc(getMediaThumbnail(entity.id))
				}
			} catch (err) {
				console.error(err)
			}
		}

		// async function tryGetSeries() {
		// 	try {
		// 		const response = await getSeries({
		// 			path,
		// 		})
		// 		const entity = response.data.data?.at(0)
		// 		if (entity) {
		// 			setIconSrc(getSereisThumbnail(entity.id))
		// 		}
		// 	} catch (err) {
		// 		console.error(err)
		// 	}
		// }

		if (!is_directory) {
			tryGetMedia()
		}
	}, [path, is_directory])

	return (
		<Button
			className="flex h-full w-full flex-col items-center justify-center space-y-2 dark:hover:bg-gray-900/75"
			onDoubleClick={() => onSelect(file)}
			variant="ghost"
		>
			<div
				className={cx(
					'relative bg-cover bg-center p-0 active:scale-[.99]',
					{ 'h-20 w-20': !iconSrc },
					{ 'aspect-[2/3] w-20 rounded-sm': iconSrc },
				)}
				style={{
					backgroundImage: `url('${iconSrc || getIconSrc()}')`,
				}}
			/>
			<Text className="line-clamp-2 max-w-[5rem]" size="xs">
				{name}
			</Text>
		</Button>
	)
}
