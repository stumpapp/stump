import { Text } from '@stump/components'
import { useMemo } from 'react'

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
		<footer className="bottom-0 h-10 px-4 fixed z-10 w-full border-t border-edge bg-background">
			<div className="gap-4 flex h-full w-full items-center">
				<span className="rounded-md px-2 py-0.5 border border-dotted border-edge-subtle">
					<Text variant="muted" size="sm">
						{relativePath}
					</Text>
				</span>
			</div>
		</footer>
	)
}
