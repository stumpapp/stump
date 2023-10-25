import { Text } from '@stump/components'
import React, { useMemo } from 'react'

import { useFileExplorerContext } from './context'
import FileExplorerNavigation from './FileExplorerNavigation'

export const HEADER_HEIGHT = 40

export default function FileExplorerHeader() {
	const { currentPath } = useFileExplorerContext()

	const basename = useMemo(() => currentPath?.split('/').pop() ?? '', [currentPath])

	return (
		<header className="fixed top-[50] z-10 h-10 w-full border-y border-gray-75 bg-white px-4 dark:border-gray-900 dark:bg-gray-975 md:top-0 md:border-y-0 md:border-b">
			<nav className="flex h-full w-full items-center gap-4">
				<FileExplorerNavigation />
				<Text variant="secondary" size="sm">
					{basename}
				</Text>
			</nav>
		</header>
	)
}
