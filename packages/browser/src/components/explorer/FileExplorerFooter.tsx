import { Text } from '@stump/components'
import React, { useMemo } from 'react'

import { useFileExplorerContext } from './context'

export const FOOTER_HEIGHT = 40

export default function FileExplorerFooter() {
	const { currentPath, rootPath } = useFileExplorerContext()

	/**
	 * The relative path is the path relative to the library root.
	 */
	const relativePath = useMemo(() => {
		if (currentPath === rootPath) {
			return '/'
		}

		return currentPath?.replace(rootPath, '') ?? ''
	}, [currentPath, rootPath])

	return (
		<footer className="fixed bottom-0 z-10 h-10 w-full border-t border-edge bg-background px-4">
			<div className="flex h-full w-full items-center gap-4">
				<span className="rounded-md border border-dotted border-edge-subtle px-2 py-0.5">
					<Text variant="muted" size="sm">
						{relativePath}
					</Text>
				</span>
			</div>
		</footer>
	)
}
