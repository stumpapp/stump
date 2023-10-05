import { Text } from '@stump/components'
import React, { useMemo } from 'react'

import { useFileExplorerContext } from './context'
import FileExplorerNavigation from './FileExplorerNavigation'

export default function FileExplorerHeader() {
	const { currentPath, libraryPath } = useFileExplorerContext()

	/**
	 * The relative path is the path relative to the library root.
	 */
	const relativePath = useMemo(() => {
		if (currentPath === libraryPath) {
			return '/'
		}

		return currentPath?.replace(libraryPath, '') ?? ''
	}, [currentPath, libraryPath])

	return (
		<header className="sticky top-0 z-10 h-12 w-full bg-white dark:bg-gray-975">
			<nav className="h-full w-full">
				<div className="flex items-center justify-between gap-2">
					<FileExplorerNavigation />
					<Text variant="secondary" size="sm">
						{relativePath}
					</Text>
				</div>
			</nav>
		</header>
	)
}
