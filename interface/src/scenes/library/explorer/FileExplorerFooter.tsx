import { Text } from '@stump/components'
import React, { useMemo } from 'react'

import { useFileExplorerContext } from './context'

export const FOOTER_HEIGHT = 40

export default function FileExplorerFooter() {
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
		<footer className="fixed bottom-0 z-10 h-10 w-full border-t border-gray-75 bg-white px-4 dark:border-gray-900 dark:bg-gray-975">
			<div className="flex h-full w-full items-center gap-4">
				<span className="rounded-md border border-dotted px-2 py-0.5 dark:border-gray-800">
					<Text variant="muted" size="sm">
						{relativePath}
					</Text>
				</span>
			</div>
		</footer>
	)
}
