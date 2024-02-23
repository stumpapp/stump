import { Text } from '@stump/components'
import React, { useMemo } from 'react'

import { useFileExplorerContext } from './context'
import FileExplorerNavigation from './FileExplorerNavigation'

export const HEADER_HEIGHT = 40

export default function FileExplorerHeader() {
	const { currentPath } = useFileExplorerContext()

	const basename = useMemo(() => currentPath?.split('/').pop() ?? '', [currentPath])

	return (
		<header className="sticky top-0 z-10 h-10 w-full border-y border-edge-200 bg-background px-4 md:border-y-0 md:border-b">
			<nav className="flex h-10 w-full items-center gap-4">
				<FileExplorerNavigation />
				<Text variant="secondary" size="sm" className="line-clamp-1">
					{basename}
				</Text>
			</nav>
		</header>
	)
}
